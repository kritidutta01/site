---
title: "Why I'm betting on finance + AI for the next 13 weeks"
description: "A public commitment. What I'm building, why the finance vertical is chronically underbuilt, and what I expect to get badly wrong."
pubDatetime: 2026-05-27T09:00:00Z
tags:
  - building-in-public
  - finance-ai
  - career
featured: true
draft: false
---

I'm spending the next 13 weeks building three open-source projects at the intersection of finance and AI, in public. This post is the commitment device: the written record that forces me to be honest about what I think, what I'm building, and whether I was right.

If you want the tl;dr: **two open benchmarks and a local agentic analyst**, all in the finance domain, all shipped by August 23. The sprint started May 25.

Here's why.

---

## The bet

Finance is the most consequential vertical in AI right now, and also — counterintuitively — one of the most underbuilt ones.

Not underbuilt in terms of capital. Every bank has an AI team. Bloomberg has a model. Every fintech startup claims an "AI-powered" feature. Underbuilt in terms of *rigorous tooling that actually survives contact with real financial data*.

The gap I keep running into at work: LLM outputs for financial tasks look correct until you check them against the source document. Models confidently confuse footnote 12 with footnote 14. They extract the right number from the wrong fiscal year. They pass every vibe check and fail every audit.

The eval tooling to catch this reliably doesn't exist in open source. The benchmark that would let you *compare models* on these specific failure modes doesn't exist. And the local-first, audit-grade agent that could run on an RTX 5060 Ti and cite every claim back to a paragraph in a 10-K? Also doesn't exist.

That's the gap. I'm building into it.

---

## Why this vertical

I've been at BlackRock for five years writing production Python and ML systems in the finance domain. I know what the data actually looks like. I know which tasks are genuinely hard for LLMs versus which ones just seem hard. That domain knowledge is the only structural advantage I have over the average AI engineer, so I should use it.

There's a version of this sprint where I build a generic RAG system or a general-purpose agent framework. That version is worse: I'd be competing with hundreds of people who have more time and bigger compute budgets than me. There's no version of that which produces something undeniable.

Building specifically for finance — with real 10-K data, real adversarial framing, real footnote reconciliation problems — that's the version where my five years of context is a moat rather than background noise.

---

## What I'm shipping

**sec-cli** (ships June 2026) — a fast CLI for SEC EDGAR filings, written in Go with a Python wrapper. The core idea: SEC filings are the most important public financial dataset in the world, and the tooling for accessing them programmatically is genuinely terrible. HTML from 2003, inconsistent table formats, no clean API. `sec-cli` provides a clean interface for LLM workflows — fetch a 10-K section, parse a table, run a diff between two fiscal years.

The table parser is the real work. Building a held-out test set of 30 hand-extracted tables and hitting a documented accuracy number on it. That's the artifact that makes the project credible rather than just useful.

**FinBench** (launches August 2026) — an open benchmark for how well LLMs do actual financial analysis. Two tasks at launch:

- **Filing Extraction** (200 examples): extract specific numerical facts from real 10-K filings, with adversarially placed "plausible-but-wrong" decoy numbers nearby. The failure mode I'm targeting is the model that finds a number that looks right rather than the number that *is* right.
- **Footnote Reconciliation** (200 examples): map a line item in the financial statements to the correct footnote, in the presence of similar-looking distractors. Sounds easy. It's not.

Six frontier models evaluated at launch. Reproducible eval harness you can run on your own model. Methodology doc I'd defend in an interview.

The gap FinBench is filling: FinanceBench (the most-cited prior work) is QA-only, doesn't include adversarial construction, and hasn't been updated since 2023. FinBench is not a replacement — it's a harder, more specific benchmark for the failure modes that actually matter in deployed systems.

**Tearsheet** (launches August 2026) — a local-first agentic analyst running on my RTX 5060 Ti. Give it a ticker; it fetches the 10-K via sec-cli, generates a structured memo, and cites every claim back to a specific paragraph in the source document. Deterministic replay baked in from day one — every agent trace is replayable, every output is auditable.

The local-first constraint is intentional. An analyst tool that requires API calls to an external LLM is not something a compliance team will approve. Tearsheet is designed to run air-gapped.

---

## Why in public

Building in public isn't performance — it's evidence.

A private project with strong code is invisible until you decide to surface it. A public project with a commit history, weekly posts, and documented decisions is evidence that the work is real, the thinking is careful, and the builder ships.

I'm not naive about the distribution function here. Most of these posts will have single-digit readers for the first few weeks. That's fine. The point isn't vanity metrics in May. The point is that in August, when I reach out to companies I want to work at, the trail exists.

The secondary benefit: writing forces precision. I can't write a clear post about why I chose a deterministic scorer over an LLM-as-judge for the Filing Extraction task unless I actually understand the tradeoff. The posts are a forcing function on the quality of the thinking.

---

## What I expect to get wrong

**The table parser will take longer than I think.** 10-K tables are notoriously inconsistent — nested headers, merged cells, multi-column spans, inline footnotes. I'm budgeting two weeks for the parser. I expect it'll feel two weeks behind for most of that time.

**The adversarial construction for FinBench will be harder to calibrate.** "Plausible-but-wrong" is a subjective bar. Too easy and the benchmark just measures reading comprehension; too hard and it measures something that never occurs in practice. Getting this calibrated against real analyst failure modes — rather than synthetic ones — requires iteration.

**Qwen3-14B throughput at 4-bit quantization on the 5060 Ti may not be fast enough for Tearsheet's use case.** I have a working hypothesis that it'll be acceptable for single-document analysis. I don't have data on it yet. Week 5 will tell.

---

## The commitment

Every Wednesday at 9am, I'll post a technical update here. The posts will be either a deep-dive on something I built or an honest building-in-public update on what broke.

If I go dark for two weeks, I missed a target. The silence is as informative as the posts.

The sprint ends August 23. Three projects shipped, or an honest post-mortem about which ones and why.

---

*[GitHub](https://github.com/kritidutta01) · [LinkedIn](https://www.linkedin.com/in/kriti-dutta-94b661107/) · [RSS](/rss.xml)*
