---
title: 'ADR-001: Unified Platform Over Point Solution Dashboards'
description: 'Why I chose to build IE Hub as a single unified platform rather than separate dashboards per data source.'
pubDate: 2025-02-15
status: 'accepted'
deciders: ['Infrastructure Engineering', 'Technical Operations']
tags: ['architecture', 'platform', 'governance']
---

## Status

**Accepted:** February 2025

## Context

Infrastructure Engineering needed operational visibility across DataDog, PagerDuty, Jira, Slack, Zoom, and Backstage. Two approaches were considered:

1. **Point solutions:** Build separate dashboards for each data source. PagerDuty dashboard, DataDog dashboard, Jira dashboard.
2. **Unified platform:** Build a single platform that consolidates all data sources into a team-scoped operational view.

## Decision

I chose the unified platform approach (IE Hub).

## Rationale

**Cross-system correlation is the primary value.** The most important questions require data from multiple sources: "Did that release cause the outage?" requires Jira + PagerDuty + DataDog. Separate dashboards can't answer cross-system questions without manual correlation.

**Team scoping must be consistent.** If the PagerDuty view uses one team mapping and the Jira view uses another, the data contradicts itself. A unified platform uses one identity system (OrgResolver) for all views.

**Maintenance cost.** Separate dashboards require separate auth, separate deployment, separate BFF endpoints. A unified platform has one auth layer (Okta SSO), one deployment pipeline, and one BFF service.

## Consequences

- Higher upfront complexity: the BFF layer handles cross-system data joining
- Centralized data model: BigQuery as the single data warehouse for all sources
- Single identity system (OrgResolver) powers all team-scoped views
- One codebase, one deployment, one monitoring surface

## Tradeoffs Accepted

- Longer initial development timeline (15 pages vs. starting with 3-4)
- BigQuery dependency for all operational data
- Single point of failure: if IE Hub is down, all operational visibility is affected
