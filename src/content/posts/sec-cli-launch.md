---
title: "sec-cli: a fast CLI for SEC filings, built for LLM workflows"
description: "sec-cli turns any SEC EDGAR filing into clean JSON or Markdown you can pipe into a language model. No API key. No paid service. Go binary, Python wrapper, ships today."
pubDatetime: 2026-06-11T08:00:00Z
tags:
  - sec-cli
  - edgar
  - go
  - building-in-public
featured: true
draft: false
---

[sec-cli](https://github.com/kritidutta01/sec-cli) is a CLI that pulls SEC EDGAR
filings and turns them into structured output you can actually pipe into a language
model. No API key. No paid service. Compiles to a single Go binary with a Python
wrapper if you'd rather stay in Python.

```bash
go install github.com/kritidutta01/sec-cli/cmd/sec-cli@latest

export SEC_CLI_USER_AGENT="Your Name your@email.com"  # EDGAR requires this

sec-cli get AAPL --section "Risk Factors" --output md
sec-cli diff NVDA --from 2023 --to 2024 --output md
```

That's it for the quick start.

---

## The problem it solves

EDGAR is the most important public financial dataset in the world. It's also a
nightmare to work with programmatically. Modern 10-K filings from large companies
run 200+ pages of iXBRL-embedded HTML where financial figures are scattered across
the document, table structure is encoded in presentation linkbase XML shipped
alongside the filing, and section boundaries are inferred from inline CSS rather
than semantic tags.

The existing open source options either give you a raw HTML dump you have to
parse yourself, or a paid API where you're trusting someone else's extraction
logic and can't audit it.

sec-cli closes that gap. The output is something you'd be comfortable pasting
directly into a Claude or GPT context window.

---

## What it does

`sec-cli get` fetches and parses a filing, then renders it as JSON, Markdown, or
plain text. The full filing or a single section.

```bash
sec-cli get AAPL                                   # latest 10-K, JSON
sec-cli get AAPL --year 2023 --output md           # 2023 filing as Markdown
sec-cli get AAPL --section "Risk Factors"          # one section, latest filing
sec-cli get MSFT --section 1A --output text        # by item number
sec-cli get AAPL --type 10-Q                       # quarterly instead of annual
```

`sec-cli diff` compares two years of the same filing and surfaces what actually
changed, not every comma rephrasing.

```bash
sec-cli diff AAPL --from 2022 --to 2024            # structural diff, JSON
sec-cli diff AAPL --from 2022 --to 2024 --output md
sec-cli diff NVDA --from 2023 --to 2024 --section "1A" --layer lexical
```

Three diff layers: structural (subsection grain, added/removed/modified), lexical
(word level, annotated `[+..+]` / `[-..-]`), and semantic (embedding distance
ranking, planned for v1.0.1). Financial table diffs align rows by GAAP concept
(`us-gaap:Revenues` matches whether the label says "Net revenues" or "Net sales")
so the comparison is meaningful across year-label changes.

---

## Two decisions that matter

**iXBRL fact stream over HTML table walking.** For modern filings (2019 and up for
large companies), every financial figure in the document is tagged with its GAAP
concept name, reporting period, and scale. sec-cli reads those tags directly rather
than trying to guess structure from table layout. The same data FactSet and
Bloomberg read. The accuracy numbers reflect this: on the test corpus, statement
cell accuracy is 100% across all fixtures. That will come down once the v1.0.1
real-filing corpus (AAPL, MSFT, JPM) is added, but the ceiling is fundamentally
higher than any layout-driven approach.

**Every table carries a confidence signal.** When the fact stream fills a table
completely, confidence is `high`. When coverage drops below 95%, it degrades to
`medium` or `low`. The parser never silently produces a clean-looking table from
partial data. Pre-iXBRL filings (anything before 2019) are refused cleanly with a
pointer to v1.1, not attempted and corrupted.

```json
"confidence": {
  "level": "high",
  "row_match_rate": 0.97,
  "cell_resolved_rate": 0.96
}
```

---

## Python wrapper

If you'd rather stay in Python:

```bash
pip install seccli
```

```python
import seccli

doc = seccli.get("AAPL")
doc.metadata.company          # "Apple Inc."
doc.tables[0].rows[0].values  # [391035000000, 383285000000, ...]

changes = seccli.diff("AAPL", frm=2022, to=2024)
for s in changes.sections:
    print(s.item, s.status)   # "1A", "modified"
```

The wrapper drives the binary via subprocess and deserializes the JSON into typed
dataclasses. No additional dependencies.

---

## What's in and what isn't

v1.0 supports iXBRL era filings only. 10-K, 10-Q, and 8-K from large filers since
2021, mid and small cap since earlier rollouts. If you need filings from before
2019, that's a v1.1 scope item and the error message will tell you so.

The test suite is hermetic: a fake HTTP transport, recorded fixtures, no network
calls. `go test ./...` works offline. The accuracy harness scores the pipeline
against a corpus of synthetic hand-verified fixtures; real-filing corpus expansion
is v1.0.1.

---

## Why I built this

sec-cli is the infrastructure layer for two larger projects I'm shipping this
summer: [FinBench](https://github.com/kritidutta01/finbench), an open benchmark
for financial LLM reasoning, and [Tearsheet](https://github.com/kritidutta01/tearsheet),
a local agentic analyst with deterministic replay. Both depend on being able to
pull and parse 10-K filings reliably. Rather than embed that logic inside each
project, I built it as a standalone CLI other people can actually use.

The code is at [github.com/kritidutta01/sec-cli](https://github.com/kritidutta01/sec-cli).
DESIGN.md explains the extraction decisions in detail.

---

*[GitHub](https://github.com/kritidutta01) · [LinkedIn](https://www.linkedin.com/in/kriti-dutta-94b661107/) · [RSS](/rss.xml)*
