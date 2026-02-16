---
title: 'ADR-002: Governed Tools Over Freeform SQL for AI Agent'
description: 'Why the CI Analysis Agent uses 36 structured tools instead of letting the LLM generate arbitrary SQL queries.'
pubDate: 2025-04-10
status: 'accepted'
deciders: ['Infrastructure Engineering', 'Security']
tags: ['ai', 'security', 'architecture']
---

## Status

**Accepted:** April 2025

## Context

The CI Analysis Agent needs to query 21 BigQuery tables to answer operational questions. Two approaches were considered:

1. **Freeform SQL generation:** Let Claude generate arbitrary SQL queries based on the user's question and a schema description.
2. **Governed tools:** Build 36 specialized tools, each with a typed input schema, parameterized queries, and validation logic.

## Decision

I chose governed tools over freeform SQL generation.

## Rationale

**Security.** An LLM generating SQL against production operational data creates SQL injection risk and makes security auditing nearly impossible. Governed tools use parameterized queries. The LLM selects which tool to invoke and provides validated parameters, but never constructs raw SQL.

**Reliability.** LLM-generated SQL is probabilistic. It might hallucinate column names, use incorrect join conditions, or construct syntactically invalid queries. Governed tools execute the same validated query every time.

**Performance.** Each tool's query is hand-optimized for its specific access pattern: partition pruning, cluster filtering, appropriate join strategies. An LLM wouldn't know to apply these optimizations.

**Auditability.** Every tool invocation is logged with the tool name, input parameters, execution time, and rows returned. This creates a clear audit trail for security review.

## Consequences

- 36 tools to build and maintain (vs. schema description + prompt engineering)
- Less flexible: the agent can only answer questions its tools support
- New question patterns require building new tools (hours, not minutes)
- But: predictable, secure, performant, and auditable

## Tradeoffs Accepted

- Development cost of 36 structured tools vs. a single SQL generation prompt
- Reduced flexibility for novel query patterns
- Ongoing maintenance as the data model evolves (new tables require new tools)
