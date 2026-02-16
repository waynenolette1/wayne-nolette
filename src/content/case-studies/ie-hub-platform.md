---
title: 'IE Hub: Cross-System Operations Platform'
description: 'Internal platform connecting DataDog, PagerDuty, Jira, Slack, Zoom, and Backstage into one team-scoped dashboard for Infrastructure Engineering. 15-page React frontend, AI investigation agent with 36 validated tools, and monitor tracking for 9,000+ monitors.'
order: 1
role: 'Technical Operations Manager II'
duration: '12+ months'
outcome: 'Single operational view across 6+ data sources, 15-page platform, 9,000+ monitors tracked'
tech:
  [
    'React 19',
    'TypeScript',
    'Tailwind CSS',
    'BigQuery',
    'GCP',
    'Cloud Run',
    'Okta SSO',
    'Node.js',
  ]
skills:
  [
    'systems-design',
    'technical-leadership',
    'developer-experience',
    'data-engineering',
    'reliability',
  ]
metrics:
  primary: '6 Systems Integrated'
  secondary: '21 BigQuery Tables'
ownership: 'Designed the data model, built the React frontend, implemented the BFF layer, and led integration of the Agentic Platform AI agent. Sole technical owner across all components.'
---

## Context

Infrastructure Engineering at ZoomInfo had a visibility problem. Operational data lived in silos: DataDog for monitoring, PagerDuty for incidents, Jira for change management, Slack and Zoom for communications, Backstage for service ownership. Teams couldn't answer basic questions without manually cross-referencing multiple tools:

- "How many critical incidents has my team had this quarter?"
- "Are our monitors healthy or is there drift?"
- "What's the cost impact of our incidents?"
- "Did our releases follow change management process?"

Reporting was manual. Ownership was unclear. Compliance was reactive. No single system connected service health to team performance to financial impact.

I proposed and built IE Hub to consolidate all six data sources into one team-scoped platform for Infrastructure Engineering.

## Technical Architecture

IE Hub is a layered system with clear separation of concerns:

```
Architecture Stack:

┌─────────────────────────────────────────────┐
│  UI Layer (React 19 + TypeScript + Tailwind)│
│    15 pages, team-scoped dashboards         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  BFF Layer (Node.js service)                │
│    Cross-system aggregation, team scoping   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Data Layer (BigQuery)                      │
│    21 tables across 6 datasets              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Backend Services (Cloud Run)               │
│    16+ microservices, Cloud Scheduler       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Infrastructure (Terraform IaC)             │
│    dev / stg / prd environments             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  AI Layer (Agentic Platform)                │
│    CI Analysis Agent, OrgResolver           │
└─────────────────────────────────────────────┘
```

### Frontend Platform (XCL Tools ZI)

The frontend is a 15-page React 19 + TypeScript application built with Tailwind CSS:

- **Team Hub Dashboard:** central landing page with team-scoped operational summary
- **Executive Briefing:** leadership-ready overview of organizational health
- **Maturity Model Tracking:** team operational maturity scoring and trends
- **Incident Cost Analytics:** financial impact per incident, per team, per quarter
- **CMG / CMv2 Violation Monitoring:** change management compliance tracking
- **DataDog Monitor Tracking:** health, ownership, and coverage for 9,000+ monitors
- **PagerDuty Schedule Health:** on-call coverage, reliability, and rotation gaps
- **Policy Tracking:** cross-cutting compliance views
- **Cost Intelligence:** infrastructure and incident cost breakdowns
- **AI Investigation Agent:** embedded CI Analysis Agent via Agentic Platform
- **Service Deep-Dive Profiles:** per-service health, incidents, and ownership

Key technical features:

- Okta SSO with admin impersonation for support scenarios
- Server-side pagination for large datasets
- CSV exports for all tabular views
- Structured error handling with user-friendly error states
- E2E + unit testing for critical workflows

### Backend (BFF + BigQuery)

The BFF layer is a Node.js service that sits between the UI and BigQuery. The frontend never queries BigQuery directly. Instead, the BFF aggregates data from 21+ tables across 6 datasets, enriches cross-system relationships (linking a PagerDuty incident to a Jira release to a DataDog monitor), and applies team scoping via OrgResolver. It also handles retry logic and exposes versioned API endpoints.

This is the canonical pattern for IE Hub: **the BFF owns cross-system joins, the UI owns presentation.** Keeping cross-system aggregation out of the frontend meant the React app stayed maintainable even as we added data sources.

The 6 BigQuery datasets cover:

1. **PagerDuty:** incidents, services, teams, schedules, escalation policies
2. **Jira:** releases, change management records, violations
3. **DataDog:** monitors, downtimes, SLO data
4. **Slack:** channel activity, war room participation
5. **Zoom:** incident call tracking
6. **Incident Cost:** financial impact modeling, salary references, cost calculations

### AI Layer (Agentic Platform Integration)

IE Hub embeds an AI investigation agent via the internal Agentic Platform. It runs parameterized queries against production data through validated tool invocations. The agent can only call predefined tools. Each tool validates inputs, constructs a parameterized BigQuery query, and logs the execution with timing spans.

The agent uses Claude 4.5 Sonnet for reasoning and tool orchestration, and GPT-4o-mini for suggestion generation. There are 36 tools total, each with input validation and sanitization at the tool boundary. Execution is logged with timing spans for observability.

Users can ask natural language questions like:

- "Show me CIs for my team in the last 90 days"
- "Which Stand services caused incidents?"
- "What was the cost impact of CI-3285?"
- "Who approved releases that led to incidents?"
- "What is our P95 TTR for Critical severity?"

The agent resolves identity via OrgResolver, determines tool strategy, executes optimized BigQuery queries, correlates deployment + cost + org data, and returns structured results.

### OrgResolver (Identity Resolution)

**OrgResolver** is the identity resolution system that makes team-scoped queries work. This is the canonical definition: when a user says "show my team's CIs," OrgResolver identifies them from their Okta session, resolves their team membership via `rdemp_records` in BigQuery, maps team to services to incidents to costs, and supports full leadership chain traversal (director → VP → SVP).

Every view in IE Hub inherits this scoping automatically. A dashboard, a report, an AI query: they all resolve through the same identity layer. This was the highest-leverage decision in the architecture. Without it, every feature would need its own team-filtering logic.

## Key Decisions

### Single Platform Over Point Solutions

The alternative was building separate dashboards for each data source. I argued for one platform because cross-system correlation is where the real insight lives. Knowing that a release violated change management AND caused an incident AND cost $X is only possible when data is joined. Team scoping needs to be consistent across every view. Maintenance cost scales linearly with separate tools but stays roughly constant with one platform.

### BigQuery as Operational Data Warehouse

BigQuery was chosen because it was already in use for data infrastructure at ZoomInfo, handles 21+ tables with complex joins efficiently, enables the AI agent to query production data with controlled access, and is cost-effective for analytical query patterns (column-oriented, pay-per-query).

### Embedding AI via Agentic Platform

Rather than building a standalone AI tool, I integrated the agent directly into IE Hub via the internal Agentic Platform. It runs on internal infrastructure with logging and access controls. The agent inherits the user's team scope via OrgResolver. Users encounter it within their operational workflow, not as a separate tool. Execution is logged, tools are validated, queries are parameterized.

## What Was Harder Than Expected

Cross-system data quality was the biggest ongoing challenge. Service names differ between PagerDuty, DataDog, and Jira. Team names change after reorgs. User emails don't always match across systems. We spent weeks building and maintaining the `service_mappings` table to reconcile naming conventions, and it still requires periodic manual review when new services are onboarded.

The other surprise was adoption patterns. Some pages saw immediate daily use (Team Hub, Incident Cost Analytics), while others we thought would be popular needed significant iteration before anyone used them regularly. Building all 15 pages before validating with users was a mistake. A phased rollout with feedback loops after the first 5-6 pages would have been more efficient.

## Results

| Capability                   | Before IE Hub          | After IE Hub                             |
| ---------------------------- | ---------------------- | ---------------------------------------- |
| Operational view             | Siloed across 6+ tools | Single team-scoped platform              |
| Incident cost visibility     | None                   | Per-incident, per-team, per-quarter      |
| Monitor tracking             | Manual spot-checks     | 9,000+ monitors tracked                  |
| Change management compliance | Reactive audits        | Real-time violation tracking             |
| AI investigation             | None                   | Natural language queries across all data |
| Reporting                    | Manual spreadsheets    | Automated dashboards + CSV export        |
| Ownership resolution         | Tribal knowledge       | Automated via OrgResolver                |

### Business Impact

- Cross-system incident analysis available in seconds instead of 30-60 minutes of manual cross-referencing
- Automated compliance monitoring catches violations early instead of finding them in quarterly audits
- OrgResolver maps every metric to a team and leader, so accountability is automatic
- Incident costs are tracked and attributable, giving leadership real numbers for investment decisions
- Executive Briefing page replaces manual reporting that previously took hours
- Deployment risk scoring flags issues before production instead of after

## Lessons

### Would Repeat

**BFF as the data orchestration layer.** Keeping the frontend thin and pushing cross-system aggregation to the BFF kept the React app maintainable. The BFF handles the complexity of joining 6 data sources while the UI focuses on presentation.

**OrgResolver as a foundational primitive.** Making identity resolution a first-class system component meant every feature automatically inherited team scoping. Every new page, every new data source, every AI query just works with the user's organizational context.

**Integrating AI directly into the workflow.** Embedding the agent in IE Hub rather than building a standalone tool meant engineers discovered it while doing their daily work. Adoption was organic rather than forced.

### Would Avoid

**Starting with a formal data quality audit.** I should have mapped identifier inconsistencies across all six systems before building the correlation layer. The time spent normalizing team names, service identifiers, and user emails after the fact was significant and preventable.

**Building all pages before user validation.** The pages that got the most use were obvious in retrospect. Starting with core pages and adding based on actual demand would have saved effort on pages that needed heavy iteration.
