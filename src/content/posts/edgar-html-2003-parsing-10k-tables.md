---
title: "EDGAR's HTML is from 2003: what it takes to parse 10-K tables"
description: "A technical deep-dive on the format detection, iXBRL fact extraction, and table projection I built into sec-cli. The boring-but-hard part of making LLM workflows over financial filings actually work."
pubDatetime: 2026-06-03T09:00:00Z
tags:
  - sec-cli
  - edgar
  - go
  - ixbrl
  - building-in-public
featured: false
draft: false
---

I spent the past two weeks implementing the parsing core of
[sec-cli](https://github.com/kritidutta01/sec-cli) — the part that takes a raw
SEC filing and turns it into clean, structured output you can pipe into a language
model without embarrassment. This post is a technical record of what that
actually required.

The short version: EDGAR filings arrive in three mutually incompatible formats
depending on when the company filed them. Figuring out which format you have,
and then extracting tables from it correctly, is the bulk of the implementation
work.

---

## The three eras

The SEC's EDGAR system is a 30-year-old filing archive. Every public company
files there. The format of what they file has changed significantly over time:

**Pre-2010 (ASCII era).** Plain text with SGML document wrappers, form-feed
page breaks, and runs of dashes or equals signs as horizontal rules. Structure
is implicit — you infer a table from the visual alignment of whitespace-padded
columns. There is no semantic markup anywhere.

**2010–2021 (plain HTML era).** Table structure is explicit HTML, but there is
no semantic layer. Row labels say "Revenues" or "Net income" but there is no
machine-readable annotation linking those labels to GAAP concept definitions.
Column headers are typically bare years. Inline styles encode visual formatting
that sometimes — but not reliably — correlates with semantic meaning (bold
often means "total", but not always).

**2019+ iXBRL era (all large filers by 2021).** Inline XBRL embedded in HTML.
The SEC mandated this. Every material financial figure in the filing is wrapped
in an `<ix:nonFraction>` or `<ix:nonNumeric>` element that carries: the GAAP
concept name (e.g. `us-gaap:Revenues`), a `contextRef` pointing to the
reporting period, a `unitRef`, a `decimals` precision indicator, and a `scale`
multiplier. The document is still HTML you can render in a browser, but it also
carries a structured data layer that's unambiguous about what every number means.

v1.0 of sec-cli targets the iXBRL era only. The modern corpus — any filing from
a large or mid-cap company since 2021 — is entirely iXBRL. Supporting the
earlier formats would require a completely different extraction path with a
fundamentally lower accuracy ceiling, and mixing both paths in v1.0 would smear
the accuracy story. Pre-iXBRL filings are detected and refused cleanly
(`parsed: false, reason: "pre-iXBRL filing — v1.1 target"`) rather than
attempted badly.

---

## The format router

Before you can parse anything you need to know what you're looking at. The
format router in `internal/router` classifies raw filing bytes using four layers,
each cheaper than the last:

**Layer 1 — filing index resolution.** EDGAR often returns an index page
rather than the primary document directly: an HTML table listing all the
documents in a submission, with the 10-K as one row. The router detects this
(looks for an index-shaped table with document links), fetches the primary
document, and re-enters classification. Recursion is bounded at depth 1 — a
real primary document should never itself be an index.

**Layer 2 — not HTML.** If the bytes don't contain an `<html>` tag in the
first 64 KB, they're either a pre-2010 ASCII filing or something unrecognized.
ASCII filings are identified by SGML wrappers (`<SEC-DOCUMENT>`, `<DOCUMENT>`,
`<TYPE>`) or by form-feed characters combined with runs of dashes — the
"line art" those old filings use as page rules. Everything else is `Unknown`.

**Layer 3 — no iXBRL namespace.** iXBRL filings declare
`xmlns:ix="http://www.xbrl.org/2013/inlineXBRL"` on the `<html>` root element.
If that string isn't in the first 64 KB, the document is plain HTML. Layer 3 is
a single `bytes.Contains` call on the document head — fast enough to dismiss
the entire 2010–2021 corpus without parsing.

**Layer 4 — tag density.** For documents that declare the iXBRL namespace, the
router counts the fraction of *financial-figure* table cells that carry an `ix:`
wrapper. This separates fully-tagged iXBRL filings (density ≥ 0.80) from
partially-tagged ones (density ≥ 0.10) that showed up during the SEC's
transition period.

The density threshold sounds simple but required one non-obvious adjustment:
measuring density over *all* numeric cells produces a misleadingly low number.
AAPL's FY2024 10-K has page numbers, footnote markers (1, 2, 3…), headcounts,
and small integers scattered throughout that are never iXBRL-tagged. Measuring
over those drops AAPL's density from the true ~0.89 to around 0.70 — close
enough to the 0.80 threshold to be fragile.

The fix: exclude cells whose text is a calendar year (1900–2100 range, used as
column headers) or a "small integer" below a ceiling of 100 (page numbers,
footnote markers, headcounts). Only cells with values ≥ 100 that aren't bare
years count toward the density measurement. After this filter, AAPL lands
comfortably above the threshold.

---

## iXBRL: facts, contexts, and scale

Once you know you have an iXBRL filing, the extraction path has two parts: the
fact stream and the presentation linkbase.

**The fact stream** is everything in the `<ix:nonFraction>` and
`<ix:nonNumeric>` elements scattered throughout the document. Each fact carries:

- **Concept**: the GAAP taxonomy name, e.g. `us-gaap:Revenues`
- **contextRef**: a reference to a `<xbrli:context>` element in the
  `<ix:header>` that defines the reporting period and entity
- **scale**: `scale="6"` means multiply the raw value by 10^6. Annual reports
  typically report in millions.
- **decimals**: precision (e.g. `-6` means precise to the nearest million).
  This is *informational*, not a magnitude — do not double-apply with scale.

Two things that caused bugs:

*Sign via parentheses.* In financial statements, negative values are written
`(123)` rather than `-123`. The iXBRL spec says the element should carry a
`sign="-"` attribute in this case, and some filers do. But many filers omit the
attribute and just wrap the rendered number in parentheses in the surrounding
text. The fact extractor has to track whether an `ix:nonFraction` element sits
inside a run of text that opens with `(` and closes with `)`. Getting this wrong
produces silently-inverted values — a loss reported as a gain.

*Segment contexts.* A single concept like `us-gaap:Revenues` often appears in
multiple contexts: once for the consolidated entity (what you want) and once per
reportable segment (Americas revenue, Europe revenue, etc.). The fact index keys
on `(concept, contextRef)`, so without filtering you'd see multiple rows for the
same line item. Primary consolidated contexts have no segment dimension; segment
contexts carry a `<xbrli:segment>` child in the context definition. The
projection layer filters to primary contexts only.

---

## The presentation linkbase

The fact stream gives you values. It doesn't tell you which statements they
belong to, what order the rows go in, or what the display label is for each
concept.

That information lives in the presentation linkbase — a separate XML file
(`*_pre.xml`) that EDGAR requires filers to include alongside the primary
document. The linkbase defines:

- **Roles**: each financial statement gets a role URI, e.g.
  `http://apple.com/role/CONSOLIDATEDSTATEMENTSOFOPERATIONS`
- **Concept order**: an arc structure that defines parent-child relationships
  and the presentation order of every concept within each role
- **Preferred labels**: a per-arc label role that tells you whether a concept
  should render its "periodStartLabel" (opening cash balance in a cash flow
  statement) or "totalLabel" (signals this concept is a total line)

The linkbase is where the semantic structure lives. Without it, you'd have a bag
of facts with no statement membership, no row ordering, and no way to
distinguish "Total operating expenses" from a regular line item.

---

## Table projection

Given a role's ordered concept list and the indexed fact stream, the table
projection fills a rows × columns grid:

**Rows** come from the linkbase in presentation order, with structural
(parent-only) concepts filtered out. Row type is classified from the preferred
label: `roleTotalLabel` → `total`, a non-structural parent → `subtotal`,
everything else → `data`.

**Columns** are the primary contexts that carry facts for the role's concepts.
Not every context qualifies as a column — some appear in only one or two rows
due to incidental cross-statement tagging (cash flow reconciliations often tag
balance sheet concepts at extra period-ends). The router applies a coverage
floor: a context must cover at least 50% of the rows that the best-covered
context covers. This drops the incidental ones cleanly.

**Opening and closing balances** in cash flow statements are a special case.
They're shown inside a duration column (the fiscal year) but are actually
instant-period facts (the balance at a specific date). The projection handles
this via the `periodStartLabel` and `periodEndLabel` preferred label roles: a row
with `periodEndLabel` reads the instant fact at the column's period end;
`periodStartLabel` reads the instant at one day before the period start (the
prior period's close).

**Null vs. zero.** A cell with no matching fact is `null` in the output, never
`0`. Zero is a real reported value ("we had no revenue from this segment"). Null
means "this row doesn't apply to this period." Conflating them produces wrong
totals when an LLM reads the output.

---

## The confidence contract

Every table the parser produces carries an explicit confidence signal:

```json
"confidence": {
  "level": "high",
  "row_match_rate": 0.97,
  "cell_resolved_rate": 0.96,
  "untagged_cell_count": 2
}
```

`level` is `high` (≥ 95% rows fully filled and ≥ 95% cells resolved), `medium`,
or `low`. The design principle here is borrowed from forecasting: a parser that
correctly extracts 70% of tables *and says so* is more useful than one that
attempts 100% and silently corrupts 30%. Downstream consumers — whether a human
auditing the output or an LLM summarizing it — need to know when to trust the
extraction.

On AAPL's FY2024 10-K, all three primary statements (income, balance sheet, cash
flow) project at confidence `high`. That's the baseline I'm holding for v1.0
accuracy reporting.

---

## What's next

Phase 7 is the layout fallback for narrative tables — the tables in MD&A, Risk
Factors, and notes sections that appear inside iXBRL filings but aren't
fact-tagged. These require a heuristic path (header detection from bold
formatting and year-pattern columns, footnote stripping, number normalization).
Layout-extracted tables are capped at confidence `medium` by design — the
iXBRL path's semantic grounding isn't available for them.

After that: free-text extraction, the normalized output model, SQLite cache,
and the `get` and `diff` CLI commands. The sec-cli launch post will go up when
`sec-cli get AAPL` produces output you'd actually pipe into a language model.

The code is at [github.com/kritidutta01/sec-cli](https://github.com/kritidutta01/sec-cli).
The design decisions are in `DESIGN.md` in the root of the repo — worth reading
if you're building anything in the EDGAR/financial-data space.

---

*Writing weekly while shipping this. [RSS](/rss.xml) · [GitHub](https://github.com/kritidutta01) · [LinkedIn](https://www.linkedin.com/in/kriti-dutta-94b661107/)*
