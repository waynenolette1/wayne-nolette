---
title: 'IE Hub: Operational Intelligence Platform'
description: 'Unified governance platform for Infrastructure Engineering — consolidating DataDog, PagerDuty, Jira, Slack, Zoom, and Backstage into a single team-scoped system with AI-powered investigation, cost analysis, and monitor governance for 9,000+ monitors.'
order: 1
role: 'Technical Operations Manager II'
duration: '12+ months'
outcome: 'Single operational view across 6+ data sources, 15-page platform, 9,000+ monitors governed'
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
  primary: '15 Pages'
  secondary: '9,000+ Monitors'
ownership: 'Architected the entire platform from concept to production — designed the data model, built the React frontend, implemented the BFF layer, and led integration of the Agentic Platform AI agent. Sole technical owner across all components.'
---

## Context

Infrastructure Engineering at ZoomInfo had a visibility problem. Operational data lived in silos — DataDog for monitoring, PagerDuty for incidents, Jira for change management, Slack and Zoom for communications, Backstage for service ownership. Teams couldn't answer basic questions without manually cross-referencing multiple tools:

- "How many critical incidents has my team had this quarter?"
- "Are our monitors healthy or is there governance drift?"
- "What's the cost impact of our incidents?"
- "Did our releases follow change management process?"

Reporting was manual. Ownership was unclear. Governance was reactive. There was no single system that connected service health to team performance to financial impact.

I proposed and built IE Hub — a unified operational intelligence platform that functions as the Infrastructure Engineering operating system.

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
│  Governance Services (Cloud Run)            │
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

The frontend is a 15-page React 19 + TypeScript application built with Tailwind CSS. Pages include:

- **Team Hub Dashboard** — central landing page with team-scoped operational summary
- **Executive Briefing** — leadership-ready overview of organizational health
- **Maturity Model Tracking** — team operational maturity scoring and trends
- **Incident Cost Analytics** — financial impact per incident, per team, per quarter
- **CMG / CMv2 Violation Monitoring** — change management compliance tracking
- **DataDog Monitor Governance** — health, ownership, and governance for 9,000+ monitors
- **PagerDuty Schedule Health** — on-call coverage, reliability, and rotation gaps
- **Governance Policy Tracking** — cross-cutting policy compliance views
- **Cost Intelligence** — infrastructure and incident cost breakdowns
- **AI Investigation Agent** — embedded CI Analysis Agent via Agentic Platform
- **Service Deep-Dive Profiles** — per-service health, incidents, and ownership

Key technical features:

- **Okta SSO** with admin impersonation for support scenarios
- **Server-side pagination** for large datasets
- **CSV exports** for all tabular views
- **Structured error handling** with user-friendly error states
- **E2E + unit testing** for critical workflows

### Backend (BFF + BigQuery)

The Backend-for-Frontend (BFF) layer serves as the data orchestration layer between the UI and BigQuery. It:

- Aggregates data from 21+ BigQuery tables across 6 datasets
- Enriches cross-system relationships (e.g., linking a PagerDuty incident to a Jira release to a DataDog monitor)
- Applies team scoping and organizational mapping via OrgResolver
- Implements retry logic and resilience patterns
- Exposes versioned API endpoints

The 6 BigQuery datasets cover:

1. **PagerDuty** — incidents, services, teams, schedules, escalation policies
2. **Jira** — releases, change management records, violations
3. **DataDog** — monitors, downtimes, SLO data
4. **Slack** — channel activity, war room participation
5. **Zoom** — incident call tracking
6. **Incident Cost** — financial impact modeling, salary references, cost calculations

### AI Layer (Agentic Platform Integration)

IE Hub embeds a production-grade AI investigation agent via the internal Agentic Platform. This is not a chatbot — it's a governed operational intelligence engine.

The agent uses:

- **Claude 4.5 Sonnet** for reasoning and tool orchestration
- **GPT-4o-mini** for suggestion generation
- **36 governed production tools** with structured invocation
- **Input sanitization and guardrails** at every tool boundary
- **Execution logging with timing spans** for observability

Users can ask natural language questions like:

- "Show me CIs for my team in the last 90 days"
- "Which Stand services caused incidents?"
- "What was the cost impact of CI-3285?"
- "Who approved releases that led to incidents?"
- "What is our P95 TTR for Critical severity?"

The agent resolves identity via OrgResolver, determines tool strategy, executes optimized BigQuery queries, correlates deployment + cost + org data, and returns structured results.

### OrgResolver (Identity Resolution)

OrgResolver enables natural language team-scoped queries. When a user says "show my team's CIs," the system:

1. Identifies the user from their Okta session
2. Resolves their team membership via `rdemp_records` in BigQuery
3. Maps team → services → incidents → costs
4. Supports full leadership chain traversal (director → VP → SVP)

This enables every view in IE Hub to be automatically scoped to the user's organizational context.

## Key Decisions

### Unified Platform Over Point Solutions

The alternative was building separate dashboards for each data source. I argued for a unified platform because:

- **Cross-system correlation** is where the real insight lives — knowing that a release violated change management AND caused an incident AND cost $X is only possible when data is joined
- **Team scoping** needs to be consistent — every view should respect the same organizational hierarchy
- **Maintenance cost** scales linearly with the number of separate tools but stays constant with a unified platform

### BigQuery as Operational Data Warehouse

BigQuery was chosen over alternatives because:

- Already in use for data infrastructure at ZoomInfo
- Handles the scale of 21+ tables with complex joins efficiently
- Enables the AI agent to query production data directly with governed access
- Cost-effective for analytical query patterns (column-oriented, pay-per-query)

### Embedding AI via Agentic Platform

Rather than building a standalone AI tool, I integrated the AI investigation agent directly into IE Hub via the internal Agentic Platform. This was a deliberate architectural decision:

- **Not experimental** — it runs on enterprise infrastructure with governance
- **Context-aware** — the agent inherits the user's team scope and permissions
- **Discoverable** — users encounter it naturally within their operational workflow
- **Accountable** — execution is logged, tools are governed, queries are sanitized

## Results

| Capability                   | Before IE Hub          | After IE Hub                             |
| ---------------------------- | ---------------------- | ---------------------------------------- |
| Operational view             | Siloed across 6+ tools | Single team-scoped platform              |
| Incident cost visibility     | None                   | Per-incident, per-team, per-quarter      |
| Monitor governance           | Manual spot-checks     | 9,000+ monitors governed                 |
| Change management compliance | Reactive audits        | Real-time violation tracking             |
| AI investigation             | None                   | Natural language queries across all data |
| Reporting                    | Manual spreadsheets    | Automated dashboards + CSV export        |
| Ownership resolution         | Tribal knowledge       | Automated via OrgResolver                |

### Business Impact

- **Faster incident analysis** — cross-system correlation available in seconds
- **Reduced governance drift** — automated compliance monitoring catches violations early
- **Clear team accountability** — OrgResolver maps every metric to a team and leader
- **Financial transparency** — incident costs are tracked and attributable
- **Leadership-level insight** — Executive Briefing page replaces manual reporting
- **Improved release safety** — deployment risk scoring flags issues before production

## Lessons

### Would Repeat

**Building the BFF layer as a data orchestration service.** Keeping the frontend thin and pushing cross-system aggregation to the BFF layer kept the React app maintainable. The BFF handles the complexity of joining 6 data sources while the UI focuses on presentation.

**OrgResolver as a foundational primitive.** Making identity resolution a first-class system component — not an afterthought — meant every feature we added automatically inherited team scoping. This was the highest-leverage decision in the architecture.

**Integrating AI directly into the workflow.** Embedding the agent in IE Hub rather than building a standalone tool meant engineers discovered it naturally while doing their daily work. Adoption was organic rather than forced.

### Would Avoid

**Underestimating the data quality challenge.** Cross-system data correlation requires clean, consistent identifiers. We spent significant time normalizing team names, service identifiers, and user emails across PagerDuty, Jira, and DataDog. Starting with a formal data quality audit would have saved weeks.

**Building all 15 pages before validating with users.** Some pages saw immediate heavy adoption (Team Hub, Incident Cost Analytics), while others needed significant iteration. A phased rollout with user feedback loops would have been more efficient.
