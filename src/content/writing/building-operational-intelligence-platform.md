---
title: 'Building a Cross-System Operations Platform from Scratch'
description: 'How I consolidated 6 data sources into a single team-scoped system for Infrastructure Engineering. Architecture, data model, and the decisions that made it work.'
pubDate: 2025-10-15
tags: ['architecture', 'platform', 'react', 'bigquery']
draft: false
confidenceLevel: high
featured: true
project: 'ie-hub-platform'
---

**TL;DR**: Infrastructure Engineering had operational data scattered across DataDog, PagerDuty, Jira, Slack, Zoom, and Backstage. I built IE Hub to consolidate all of it into a single team-scoped view. 15 pages, 21 BigQuery tables, 16+ Cloud Run services. Cross-system correlation is the product, not individual dashboards.

## The Problem

Every week, someone asked a question that required manually cross-referencing three tools:

- "How many critical incidents has my team had this quarter?" (PagerDuty + Jira + DataDog)
- "Did that release cause the outage?" (Jira release records + PagerDuty incidents + DataDog deployment markers)
- "What's the cost impact of our incidents?" (PagerDuty duration + Slack/Zoom war room data + salary estimates)

Nobody had a single view. Engineering managers spent hours building manual reports. Ownership was tribal knowledge. Compliance was reactive: we caught problems after they caused impact, not before.

## Architecture Decision: Single Platform vs. Point Solutions

The easy path was building separate dashboards per data source. PagerDuty dashboard here, Jira dashboard there.

I argued against it for three reasons:

1. **Cross-system correlation is the product.** Knowing a release violated change management AND caused an incident AND cost $X requires joined data. Separate dashboards can't do this.

2. **Team scoping must be consistent.** If the PagerDuty view shows Team Alpha's incidents but the Jira view uses a different team mapping, the data contradicts itself. One identity system, one truth.

3. **Maintenance scales linearly with separate tools** but stays roughly constant with a single platform. One BFF layer, one auth system, one deployment pipeline.

## The Data Layer: 21 Tables Across 6 Datasets

I organized BigQuery into domain-specific datasets:

```
pd_governance/        → Incidents, services, teams, schedules, escalation policies
jira_governance/      → Releases, change management records, violations
dd_governance/        → Monitors, downtimes, deployment markers
comms_governance/     → Slack channels, war rooms, Zoom meetings
cost_governance/      → Incident costs, salary reference, cost summaries
org_governance/       → Employee records, service mappings, monitor health
```

Each dataset has its own Cloud Run sync services that pull data on schedule: every 15 minutes for incidents, hourly for organizational data, daily for cost calculations. The BFF layer joins across datasets to answer cross-system questions.

The most important table is `rdemp_records` in `org_governance/`. This is the organizational identity table that maps every employee to their team, their team to their services, and their services to their incidents. Without this table, team scoping doesn't work.

## The Frontend: 15 Pages, One Identity

React 19 + TypeScript + Tailwind. Every page inherits the user's team scope from OrgResolver. No page requires the user to manually select a team.

The pages that get the most traffic:

**Team Hub:** the landing page. At a glance: open incidents, monitor health, recent releases, cost trend. This is what managers check every morning.

**Incident Cost Analytics:** the page that changed conversations. When you can show a VP that their org's incidents cost $X last quarter, investment in prevention becomes a business case, not a wish list.

**Monitor Tracking:** 9,000+ monitors, most with unclear ownership. This page surfaces monitors without owners, monitors that haven't fired in 6 months, and monitors with compliance violations.

**Executive Briefing:** one-page organizational health summary designed for skip-level meetings. Auto-generated, always current.

## Key Technical Decision: BFF Over Direct BigQuery Access

I considered letting the React app query BigQuery directly. Rejected it because:

- **Cross-system joins are complex.** Linking a PagerDuty incident to a Jira release to a DataDog deployment requires 3-4 table joins with team scoping. That logic belongs in a service layer, not the frontend.
- **Caching matters.** Some queries aggregate across millions of rows. The BFF caches results with team-scoped keys and TTL-based expiration.
- **Security boundary.** The BFF enforces Okta authentication and team scoping at the API level. The frontend never touches BigQuery credentials.

## What I'd Do Differently

**Start with 5 pages, not 15.** Team Hub, Incident Cost Analytics, and Monitor Tracking drove 80% of the value. The other 12 pages were important but could have been built iteratively based on user feedback instead of upfront.

**Formalize the data quality contract earlier.** Service names differ between PagerDuty ("platform-eng"), DataDog ("platform_eng"), and Jira ("Platform Engineering"). I built a service mapping table, but the normalization rules grew organically. A formal data quality audit at the start would have saved weeks of edge-case debugging.
