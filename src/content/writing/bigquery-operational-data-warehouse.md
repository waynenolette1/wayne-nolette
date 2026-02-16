---
title: 'BigQuery as an Operational Data Warehouse: 21 Tables, 6 Datasets'
description: 'How I structured BigQuery for cross-system operational analytics. Dataset organization, sync patterns, query optimization, and why a data warehouse beats a traditional database for this workload.'
pubDate: 2025-09-22
tags: ['bigquery', 'data-engineering', 'architecture', 'gcp']
draft: false
confidenceLevel: high
project: 'ie-hub-platform'
---

**TL;DR**: IE Hub needed to join data from 6 different systems: PagerDuty, Jira, DataDog, Slack, Zoom, and organizational identity. I chose BigQuery as the operational data warehouse. 21 tables across 6 datasets, synced via scheduled Cloud Run services. It handles analytical joins efficiently with columnar storage. The managed service removes infrastructure overhead. And the SQL interface lets the AI agent call validated queries without additional translation layers.

## Why a Data Warehouse, Not a Database

The obvious choice was PostgreSQL or Cloud SQL. But the access pattern is analytical, not transactional:

- "Show me all incidents for Team Alpha in Q3" (scan millions of rows, filter by team and date)
- "What's the average TTR for Critical incidents across the org?" (full-table aggregation)
- "Correlate releases with incidents in the 24 hours following deployment" (cross-table join with temporal windowing)

These are OLAP queries, not OLTP. BigQuery handles them efficiently through columnar storage and massively parallel execution. A PostgreSQL instance would require careful indexing, query tuning, and capacity planning. BigQuery just works: no indexes, no vacuuming, no connection pool management.

The tradeoff: BigQuery has higher per-query latency (~1-2 seconds) than a warm PostgreSQL cache (~10ms). For IE Hub's use case (dashboards that refresh on page load and AI agent queries) this latency is acceptable.

## Dataset Organization

6 datasets, organized by source system:

| Dataset            | Tables | Sync Frequency | Primary Use                                                                   |
| ------------------ | ------ | -------------- | ----------------------------------------------------------------------------- |
| `pd_governance`    | 5      | Every 15 min   | Incidents, services, teams, schedules, escalation policies                    |
| `jira_governance`  | 2      | Every 30 min   | Releases, change management violations                                        |
| `dd_governance`    | 3      | Every 15 min   | Monitors, downtimes, deployments                                              |
| `comms_governance` | 3      | Every 30 min   | Slack channels, war rooms, Zoom meetings                                      |
| `cost_governance`  | 3      | Daily          | Incident costs, salary reference, cost summaries                              |
| `org_governance`   | 5      | Daily          | Employee records, service mappings, monitor health, risk scores, SLA tracking |

Each dataset has its own IAM bindings. The PagerDuty sync service can write to `pd_governance` but can't read `cost_governance`. This is enforced at the Terraform level.

## Sync Patterns

Each Cloud Run sync service follows the same pattern:

1. **Fetch:** Call the source API (PagerDuty, Jira, DataDog) with a time-bounded query
2. **Transform:** Normalize field names, handle nulls, apply data quality rules
3. **Load:** Write to BigQuery via streaming insert or batch load
4. **Validate:** Run a count check to ensure the load succeeded

Incremental syncs use a high-water mark ("give me everything modified since the last sync"). Full reconciliation runs daily to catch any gaps.

The most important data quality rule: **service name normalization.** PagerDuty calls it `platform-eng`, DataDog calls it `platform_eng`, Jira calls it `Platform Engineering`. The `service_mappings` table in `org_governance` provides the canonical mapping. Every sync service normalizes service names on write.

## Query Patterns for the AI Agent

The 36 AI agent tools generate parameterized BigQuery queries. Common patterns:

**Team-scoped incident search:**

```sql
SELECT * FROM pd_governance.pd_incidents
WHERE service_id IN (
  SELECT service_id FROM org_governance.service_mappings
  WHERE team_id = @team_id
)
AND created_at BETWEEN @start_date AND @end_date
ORDER BY created_at DESC
```

**Release-to-incident correlation:**

```sql
SELECT r.*, i.*
FROM jira_governance.jira_releases_cmg r
JOIN pd_governance.pd_incidents i
  ON i.service_id IN (SELECT service_id FROM org_governance.service_mappings WHERE team_id = r.team_id)
  AND i.created_at BETWEEN r.deploy_time AND TIMESTAMP_ADD(r.deploy_time, INTERVAL 24 HOUR)
WHERE r.team_id = @team_id
```

Every query is parameterized. No string interpolation, no SQL injection risk. The `@team_id` parameter comes from OrgResolver, which validates it against the authenticated user's organizational context.

## Cost Management

BigQuery bills per query based on data scanned. With 21 tables and frequent dashboard refreshes, costs could grow quickly. Mitigation strategies:

1. **Partition tables by date.** Queries with date filters only scan relevant partitions. The `pd_incidents` table is partitioned by `created_at`. A query for "last 30 days" scans ~3% of the table.

2. **Cluster on frequently-filtered columns.** `team_id` and `service_id` are the most common filter columns. Clustering co-locates related rows, reducing bytes scanned.

3. **BFF-layer caching.** The BFF caches query results with team-scoped keys and TTL-based expiration (15 minutes for incident data, 1 hour for organizational data). Repeated dashboard loads hit the cache, not BigQuery.

4. **Materialized aggregations.** The `cost_summaries` table pre-computes per-team, per-quarter cost aggregations daily. The dashboard reads from the summary table instead of re-aggregating raw incident cost data on every load.
