---
title: 'CI Analysis Agent: AI Investigation Engine'
description: 'Enterprise-grade AI agent with 36 specialized tools querying 21 BigQuery tables across 6 datasets. Integrated via the internal Agentic Platform with Claude 4.5 Sonnet, OrgResolver identity resolution, risk scoring, and financial impact analysis.'
order: 2
role: 'Technical Operations Manager II'
duration: '8+ months'
outcome: '36 governed tools, 21 BigQuery tables, real-time incident investigation'
tech:
  [
    'Claude 4.5 Sonnet',
    'GPT-4o-mini',
    'Python',
    'BigQuery',
    'ReactAgent',
    'Cloud Run',
  ]
skills:
  [
    'ml-infrastructure',
    'systems-design',
    'data-engineering',
    'reliability',
    'developer-experience',
  ]
metrics:
  primary: '36 Tools'
  secondary: '21 BigQuery Tables'
ownership: 'Designed and built the entire agent architecture — all 36 tools, the OrgResolver identity system, risk scoring engine, financial impact pipeline, and the structured tool framework. Integrated the agent into IE Hub via the Agentic Platform.'
---

## Context

Incident investigation at ZoomInfo was a manual, time-consuming process. When a critical incident occurred, engineers and managers had to:

1. Search PagerDuty for incident details and response metrics
2. Check Jira for related releases and change management compliance
3. Look up DataDog for monitor status and deployment signals
4. Cross-reference Slack and Zoom for war room participation
5. Manually calculate cost impact from engineer time and meeting data

This process took 30-60 minutes per investigation, required expertise across multiple tools, and the results were inconsistent depending on who performed the analysis.

I built the CI Analysis Agent — an enterprise-grade AI investigation engine that automates this entire workflow through natural language queries.

## Technical Architecture

The agent is built on three foundational layers:

```
CI Analysis Agent Architecture:

┌─────────────────────────────────────────────┐
│  Agentic Platform (Enterprise AI infra)     │
│    Claude 4.5 Sonnet + GPT-4o-mini          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  ReactAgent Pattern                         │
│    Reasoning → Tool Selection → Execution   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  36 Specialized Tools                       │
│    Governed invocation, input sanitization   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  OrgResolver (Identity Resolution)          │
│    User → Team → Services → Leadership      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  BigQuery (21 tables, 6 datasets)           │
│    PagerDuty · Jira · DataDog · Slack ·     │
│    Zoom · Incident Cost                     │
└─────────────────────────────────────────────┘
```

### Agentic Platform Integration

The agent runs on ZoomInfo's internal Agentic Platform — not as a standalone prototype. This means:

- **Enterprise-grade infrastructure** — production hosting, monitoring, and SLAs
- **Governed tool execution** — tools are registered, versioned, and auditable
- **Dual LLM strategy** — Claude 4.5 Sonnet handles reasoning and tool orchestration; GPT-4o-mini generates user-facing suggestions
- **Security** — Okta authentication, team-scoped data access, input sanitization at every boundary
- **Observability** — execution logging with timing spans for performance monitoring

### ReactAgent Pattern

The agent uses the ReactAgent (Reasoning + Acting) pattern:

1. **Receive** — user submits natural language query via IE Hub
2. **Resolve** — OrgResolver maps user identity to team and service scope
3. **Reason** — Claude 4.5 Sonnet analyzes the query and determines which tools to invoke
4. **Act** — selected tools execute governed BigQuery queries
5. **Observe** — results are evaluated; agent may chain additional tool calls
6. **Respond** — structured results returned to the user

The agent can chain multiple tools in a single investigation. For example, "What was the cost impact of our last Critical incident?" triggers:

1. `search_incidents` — find recent Critical incidents for the user's team
2. `get_incident_details` — retrieve full incident metadata
3. `calculate_incident_cost` — compute financial impact from engineer time and war room data
4. `get_release_correlation` — check if a release preceded the incident

### 36 Specialized Tools

The tools are organized across 6 domains:

**PagerDuty Tools** — incident search, details, response metrics, SLA tracking, team performance, on-call schedules, escalation analysis, TTR percentiles

**Jira Tools** — release search, change management compliance, CMv2 violation lookup, deployment correlation, sprint tracking

**DataDog Tools** — monitor health, deployment markers, SLO status, monitor governance metrics, alert volume analysis

**Slack Tools** — war room participation, channel activity during incidents, communication timeline

**Zoom Tools** — incident call tracking, meeting participant analysis, response coordination metrics

**Analysis Tools** — risk scoring, financial impact calculation, RCA similarity matching, trend analysis, leadership hierarchy resolution, cross-system correlation

Each tool follows a structured pattern:

- **Input validation** — parameters sanitized before execution
- **Query construction** — parameterized BigQuery queries (no raw SQL injection)
- **Execution** — governed query execution with timeout bounds
- **Output formatting** — structured results with metadata

### OrgResolver Identity System

OrgResolver is the foundational identity layer. When a user asks "show my team's CIs," the system:

```
Identity Resolution Flow:

User Query: "show my team's CIs"
    ↓
1. Extract user from Okta session
    ↓
2. Query rdemp_records for team membership
    ↓
3. Resolve team → service mappings
    ↓
4. Map services → incidents
    ↓
5. Return team-scoped results

Supports traversal:
  user → team → director → VP → SVP
  team → services → monitors → incidents
```

This enables queries at any organizational level:

- "Show **my** team's incidents" — user's direct team
- "Show **all teams under my director**" — leadership chain traversal
- "Compare **Stand vs. Core** team health" — cross-team analysis

### BigQuery Data Layer

21 tables across 6 datasets:

**pd_incidents** — PagerDuty incident records with severity, status, timestamps, responders
**pd_services** — service catalog with team ownership and tier classification
**pd_teams** — team definitions and membership
**pd_schedules** — on-call schedules and coverage
**pd_escalation_policies** — escalation chains and policy configuration
**dd_monitors** — DataDog monitor definitions, owners, tags, status
**dd_downtimes** — scheduled maintenance windows
**dd_deployments** — deployment markers with timing and metadata
**jira_releases_cmg** — release records with change management group compliance
**jira_cmv2** — change management v2 violation records
**slack_channels** — channel activity and participation metrics
**slack_war_rooms** — incident war room creation and attendance
**zoom_meetings** — incident-related call tracking
**incident_costs** — calculated per-incident financial impact
**salary_reference** — anonymized salary bands for cost modeling
**rdemp_records** — organizational identity and team hierarchy
**service_mappings** — cross-system service identifier resolution
**monitor_governance** — monitor health scoring and governance status
**release_risk_scores** — predictive deployment risk calculations
**sla_tracking** — SLA compliance per service and team
**cost_summaries** — aggregated cost intelligence by team and quarter

### Risk Scoring Engine

The agent includes a predictive release risk scoring engine that calculates a 0-100 risk score for deployments:

```
Risk Score Calculation:

Score = w1(deployment_speed) +
        w2(cm_violations) +
        w3(historical_incidents) +
        w4(change_scope) +
        w5(time_of_day)

Inputs:
  - Deployment speed vs. team baseline
  - Change management violation history
  - Historical incident rate post-deployment
  - Scope of changes (services affected)
  - Time-of-day risk factor (off-hours deployments)

Output: 0-100 score with risk classification
  0-30:  Low risk
  31-60: Medium risk (review recommended)
  61-80: High risk (approval required)
  81-100: Critical risk (block recommended)
```

### Financial Impact Pipeline

The agent calculates per-incident costs by correlating:

- **Engineer time** — responder hours from PagerDuty acknowledgment to resolution
- **War room costs** — meeting participant count × duration from Zoom/Slack
- **Opportunity cost** — engineering time diverted from planned work
- **Salary reference** — anonymized band-level cost modeling

This enables leadership queries like:

- "What did Critical incidents cost my org last quarter?"
- "Which services have the highest incident cost?"
- "What's the ROI of investing in monitoring for Service X?"

## Key Decisions

### Governed Tools Over Freeform SQL

The agent executes structured tool invocations — not freeform SQL generation. Every query is:

- **Parameterized** — no SQL injection risk
- **Bounded** — timeout limits prevent runaway queries
- **Auditable** — tool invocations are logged with timing spans
- **Scoped** — team-level data access enforced at the query layer

This was a deliberate tradeoff: less flexible than letting the LLM write arbitrary SQL, but far more secure and predictable in production.

### Dual LLM Strategy

Claude 4.5 Sonnet handles complex reasoning and multi-step tool orchestration. GPT-4o-mini generates user-facing suggestions (e.g., "You might also want to check..."). This separation keeps costs reasonable — the expensive model reasons, the cheap model surfaces.

### ReactAgent Over Single-Turn

A single-turn approach (query → tools → response) would be simpler but couldn't handle complex investigations that require chaining multiple data sources. The ReactAgent pattern allows the agent to observe intermediate results and decide whether additional tool calls are needed.

## Results

| Capability              | Before                   | After                               |
| ----------------------- | ------------------------ | ----------------------------------- |
| Investigation time      | 30-60 min manual         | Seconds via natural language        |
| Data sources correlated | Manual cross-referencing | Automatic across 6 systems          |
| Cost visibility         | None                     | Per-incident, per-team, per-quarter |
| Risk assessment         | Ad hoc                   | Automated 0-100 scoring             |
| Identity resolution     | Tribal knowledge         | Automatic via OrgResolver           |
| Tooling                 | 0                        | 36 governed production tools        |

### Operational Impact

- Engineers can investigate incidents in seconds instead of manually navigating 6 tools
- Leadership gets financial impact data without requesting custom reports
- Risk scoring flags high-risk deployments before they reach production
- OrgResolver eliminates the "who owns this service?" question
- Every investigation is logged and auditable

## Lessons

### Would Repeat

**Building OrgResolver before the agent.** Identity resolution is the foundation everything else depends on. Without it, every query would require the user to specify exact team names, service IDs, and time ranges. With it, "show my team's CIs" just works.

**Structured tool framework with input sanitization.** Treating every tool as a governed, validated function — not a raw query template — prevented entire categories of bugs. The upfront discipline of defining input schemas for all 36 tools paid off immediately in production stability.

**Dual LLM strategy.** Using Claude for reasoning and GPT-4o-mini for suggestions keeps costs manageable. The suggestion model adds significant UX value at minimal incremental cost.

### Would Avoid

**Building all 36 tools before user validation.** Some tools see daily use (incident search, cost calculation), while others are rarely invoked. Starting with 10-15 core tools and adding based on actual usage patterns would have been more efficient.

**Underestimating the data normalization challenge.** Service names differ between PagerDuty, DataDog, and Jira. Building the service mapping table required significant effort to reconcile naming conventions across systems.
