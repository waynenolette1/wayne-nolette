---
title: 'ADR-003: BigQuery Over PostgreSQL for Operational Data'
description: 'Why I chose BigQuery as the operational data warehouse for IE Hub instead of a traditional PostgreSQL database.'
pubDate: 2025-03-01
status: 'accepted'
deciders: ['Infrastructure Engineering', 'Data Platform']
tags: ['data-engineering', 'bigquery', 'architecture']
---

## Status

**Accepted:** March 2025

## Context

IE Hub needs a data store for 21 tables of operational data synced from 6 external systems. The access pattern is analytical: cross-table joins, aggregations, time-range filters. Two primary options were considered:

1. **PostgreSQL (Cloud SQL):** Traditional relational database with ACID guarantees and low-latency point queries.
2. **BigQuery:** Managed columnar data warehouse optimized for analytical queries.

## Decision

I chose BigQuery.

## Rationale

**Analytical query pattern.** IE Hub queries scan thousands to millions of rows with aggregations and multi-table joins. BigQuery's columnar storage and massively parallel execution handle this efficiently without index tuning. PostgreSQL would require careful indexing, query planning, and capacity management.

**Managed service.** BigQuery eliminates infrastructure overhead: no connection pool management, no vacuuming, no replica configuration, no storage scaling. The team can focus on data quality and application logic.

**Existing ecosystem.** ZoomInfo already uses BigQuery extensively. IAM policies, networking, and monitoring are already configured. The AI agent's validated tools can query BigQuery directly using the same patterns as other internal systems.

**Cost model.** BigQuery's per-query billing aligns with IE Hub's access pattern: frequent but not constant queries, with significant variation in query complexity. A provisioned PostgreSQL instance would be over-provisioned most of the time.

## Consequences

- Higher per-query latency (~1-2 seconds) than warm PostgreSQL cache (~10ms)
- BFF layer caching required for acceptable dashboard load times
- No ACID transactions: sync operations must handle eventual consistency
- Dataset-level IAM provides strong isolation between data domains

## Tradeoffs Accepted

- Dashboard responsiveness depends on BFF caching layer
- Eventual consistency between source systems and BigQuery (acceptable for operational analytics, 15-minute sync cadence)
- Limited real-time capability: not suitable for sub-second alerting (DataDog handles that natively)
