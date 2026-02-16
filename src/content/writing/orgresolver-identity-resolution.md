---
title: 'OrgResolver: Identity Resolution for Natural Language Queries'
description: 'How I built an identity resolution system that turns "show my team''s CIs" into scoped BigQuery queries. User to team to services to incidents in milliseconds.'
pubDate: 2025-09-05
tags: ['architecture', 'bigquery', 'identity', 'ai']
draft: false
confidenceLevel: high
project: 'ci-analysis-agent'
---

**TL;DR**: When someone asks "show my team's CIs," the system needs to know who "me" is, what "my team" means, which services that team owns, and which incidents affected those services. OrgResolver handles this entire chain (user to team to services to incidents) in a single resolution step. It supports full leadership chain traversal (director to VP to SVP) and powers every team-scoped view in IE Hub.

## The Problem

Every operational query has an implicit identity context:

- "Show **my team's** incidents" (whose team?)
- "How are **we** doing on monitor health?" (who is "we"?)
- "Compare **Stand** vs **Core** team health" (which services belong to each?)

Without identity resolution, every query requires the user to manually specify team names, service IDs, and organizational mappings. That's friction. And friction kills adoption.

## The Resolution Chain

OrgResolver performs a 4-step resolution:

```
"show my team's CIs"
    ↓
Step 1: User Identity (Okta session → email → employee record)
    ↓
Step 2: Team Membership (employee → team via rdemp_records)
    ↓
Step 3: Service Mapping (team → services via service_mappings)
    ↓
Step 4: Data Scoping (services → incidents, monitors, releases)
```

Each step is a BigQuery lookup. The entire chain executes in under 200ms because the tables are small (thousands of rows, not millions) and indexed on the join keys.

## Leadership Chain Traversal

The most powerful feature is hierarchical traversal. OrgResolver doesn't just resolve "my team." It can resolve any level of the organizational hierarchy:

- **My team:** direct team membership
- **My director's org:** all teams under my director
- **My VP's org:** all teams under my VP
- **My SVP's org:** entire engineering organization

This is implemented as a recursive traversal of the `rdemp_records` table's `reports_to` column. Given any user, OrgResolver can walk up the chain to find their director, VP, and SVP, then walk back down to find all teams and services under that leader.

Use case: an SVP asks "what did incidents cost my org last quarter?" OrgResolver resolves their identity, finds all directors under them, all teams under those directors, all services under those teams, and all incidents against those services. One natural language query, one answer.

## Cross-System Service Mapping

Service names differ across tools:

| PagerDuty      | DataDog        | Jira                   | Backstage              |
| -------------- | -------------- | ---------------------- | ---------------------- |
| `platform-eng` | `platform_eng` | `Platform Engineering` | `platform-engineering` |

The `service_mappings` table normalizes these into a canonical service ID. OrgResolver uses this mapping to translate team-owned services into the correct identifiers for each data source.

This was one of the hardest engineering challenges, not algorithmically, but in data quality. Building the initial mapping required auditing every service across all four tools and reconciling naming inconsistencies. I automated ongoing sync to catch new services, but the initial mapping was manual.

## Why Not Just Use LDAP?

LDAP gives you organizational hierarchy but not service ownership. OrgResolver combines:

1. **Organizational identity** (who reports to whom) from HR systems
2. **Service ownership** (which team owns which services) from Backstage + PagerDuty
3. **Cross-system mapping** (service names across tools) from manual + automated reconciliation

LDAP handles #1. OrgResolver handles all three and joins them into a single resolution step.

## Integration with the AI Agent

OrgResolver is the first step in every AI agent interaction. Before the agent reasons about which tools to invoke, it resolves the user's identity and scope. This means:

- Tool queries are automatically scoped to the user's team
- The agent can reference "your team" and "your services" naturally
- Leadership queries traverse the hierarchy without explicit specification
- Every answer is contextually relevant to the asker

Without OrgResolver, the AI agent would require users to specify exact service IDs and team names in every query. That turns a natural language interface into a structured form.
