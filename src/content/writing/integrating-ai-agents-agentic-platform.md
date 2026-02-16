---
title: 'Integrating AI Agents via an Internal Agentic Platform'
description: 'How I embedded a 36-tool AI investigation agent into IE Hub. Validated tools, dual LLM strategy, and why this is not a chatbot.'
pubDate: 2025-11-20
tags: ['ai', 'llm', 'architecture', 'platform']
draft: false
confidenceLevel: high
featured: true
project: 'ci-analysis-agent'
---

**TL;DR**: I integrated a 36-tool AI investigation agent into IE Hub via our internal Agentic Platform. Claude 4.5 Sonnet for reasoning, GPT-4o-mini for suggestions, validated tool execution, and OrgResolver for identity resolution. This is not a chatbot bolted onto a dashboard. It's an investigation engine with structured tool access, embedded directly into the workflow engineers already use.

## Why Embedding Matters

We could have built the AI agent as a standalone tool. A separate URL, separate auth, separate context. Engineers would have to context-switch from their operational dashboard to the AI tool, re-explain their team context, and paste in incident IDs.

Instead, I embedded the agent directly into IE Hub at `/agent`. When an engineer is looking at their Team Hub and wants to investigate an incident, they click one tab. The agent already knows who they are, which team they're on, and which services they own, because it inherits the same OrgResolver identity that powers every other page.

That's the difference between:

- "I need to go use the AI tool" (standalone)
- "I'll just ask" (embedded)

Adoption follows friction reduction.

## The Dual LLM Strategy

Running every interaction through Claude 4.5 Sonnet would be expensive and unnecessary. I split the workload:

**Claude 4.5 Sonnet** handles:

- Reasoning about which tools to invoke
- Multi-step investigation chains (incident → release → deployment → cost)
- Complex natural language understanding ("show me CIs where TTR exceeded our P95 baseline")

**GPT-4o-mini** handles:

- Generating follow-up suggestions ("You might also want to check...")
- Formatting structured results for display
- Low-stakes text generation

This keeps per-query costs reasonable while maintaining high-quality reasoning for the hard parts.

## Validated Tools, Not Freeform SQL

The agent has 36 tools. Each tool is a structured function with:

- **Typed input schema:** parameters validated before execution
- **Parameterized BigQuery queries:** no SQL injection risk
- **Timeout bounds:** queries that exceed limits are killed
- **Execution logging:** every tool invocation is logged with timing spans

I considered letting the LLM generate arbitrary SQL. Rejected it immediately:

1. **Security.** An LLM generating SQL against production data is a security audit nightmare. Parameterized queries with validated inputs are auditable and predictable.

2. **Reliability.** LLM-generated SQL is probabilistic. Sometimes it works, sometimes it hallucinates a column name. Structured tools work every time.

3. **Performance.** I hand-optimized each query for the specific access patterns. The incident search tool uses partition pruning on date columns. The monitor tracking tool uses materialized aggregations. An LLM wouldn't know to do this.

The tradeoff: less flexible. The agent can only do what the 36 tools allow. But in practice, those 36 tools cover the questions engineers actually ask. When a new question pattern emerges, I add a tool. Takes a few hours, not a redesign.

## ReactAgent Pattern

The agent uses the ReactAgent (Reasoning + Acting) pattern rather than single-turn query-response:

1. User asks: "What caused the outage last Tuesday?"
2. Agent reasons: needs to find incidents from last Tuesday
3. Agent calls `search_incidents` with date range and user's team scope
4. Agent observes: found CI-3285, Critical severity, 45-minute duration
5. Agent reasons: should check for correlated releases
6. Agent calls `get_release_correlation` for CI-3285
7. Agent observes: Release R-1847 deployed 12 minutes before incident
8. Agent reasons: should check change management compliance
9. Agent calls `check_cm_compliance` for R-1847
10. Agent responds: "CI-3285 was caused by Release R-1847, which was deployed without change management approval..."

The chaining is critical. Single-turn would return "I found CI-3285" and stop. ReactAgent follows the investigation to its conclusion.

## What I Learned

**OrgResolver is the highest-leverage component.** Without identity resolution, every query requires the user to specify exact team names, service IDs, and time ranges. With it, "show my team's CIs" just works. Build identity resolution first; everything else becomes easier.

**36 tools is probably too many at launch.** 10 tools see daily use. 15 see weekly use. 11 are rarely invoked. Starting with 15 core tools and adding based on actual usage would have been more efficient. But having full coverage meant early users could always get an answer, which helped adoption.

**The dual LLM strategy pays for itself.** Suggestion generation via GPT-4o-mini improves the experience noticeably. Users discover capabilities they didn't know existed, and the cost is negligible compared to Claude reasoning.
