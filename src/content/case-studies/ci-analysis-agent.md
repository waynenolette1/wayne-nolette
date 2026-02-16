---
title: 'CI Analysis Agent: AI Investigation Engine'
description: 'AI agent with 36 specialized tools querying 21 BigQuery tables across 6 datasets. Integrated via the internal Agentic Platform with Claude 4.5 Sonnet for reasoning, OrgResolver identity resolution, release risk scoring, and per-incident financial impact analysis.'
order: 2
role: 'Technical Operations Manager II'
duration: '8+ months'
outcome: '36 validated tools, 21 BigQuery tables, real-time incident investigation'
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
  primary: '36 Validated Tools'
  secondary: 'No Freeform SQL'
ownership: 'Designed and built the entire agent architecture: all 36 tools, the OrgResolver identity system, risk scoring engine, financial impact pipeline, and the structured tool framework. Integrated the agent into IE Hub via the Agentic Platform.'
---

## Context

Incident investigation at ZoomInfo was a manual, time-consuming process. When a critical incident occurred, engineers and managers had to:

1. Search PagerDuty for incident details and response metrics
2. Check Jira for related releases and change management compliance
3. Look up DataDog for monitor status and deployment signals
4. Cross-reference Slack and Zoom for war room participation
5. Manually calculate cost impact from engineer time and meeting data

This process took 30-60 minutes per investigation, required expertise across multiple tools, and the results were inconsistent depending on who performed the analysis.

I built the CI Analysis Agent to automate this entire workflow through natural language queries.

## Technical Architecture

The agent is built on three foundational layers:

```
CI Analysis Agent Architecture:

┌─────────────────────────────────────────────┐
│  Agentic Platform (internal AI infra)       │
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
│    Validated invocation, input sanitization  │
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

The agent runs on ZoomInfo's internal Agentic Platform, not as a standalone prototype. This means production hosting with monitoring and SLAs. Tools are registered, versioned, and auditable. Claude 4.5 Sonnet handles reasoning and tool orchestration while GPT-4o-mini generates user-facing suggestions. Okta authentication enforces team-scoped data access, and input sanitization runs at every tool boundary. Execution logging captures timing spans for performance monitoring.

### ReactAgent Pattern

The agent uses the ReactAgent (Reasoning + Acting) pattern:

1. **Receive:** user submits natural language query via IE Hub
2. **Resolve:** OrgResolver maps user identity to team and service scope
3. **Reason:** Claude 4.5 Sonnet analyzes the query and determines which tools to invoke
4. **Act:** selected tools execute parameterized BigQuery queries
5. **Observe:** results are evaluated; agent may chain additional tool calls
6. **Respond:** structured results returned to the user

The chaining is critical. A single-turn approach couldn't handle "What was the cost impact of our last Critical incident?" because that requires four sequential lookups:

1. `search_incidents` to find recent Critical incidents for the user's team
2. `get_incident_details` to retrieve full incident metadata
3. `calculate_incident_cost` to compute financial impact from engineer time and war room data
4. `get_release_correlation` to check if a release preceded the incident

### 36 Specialized Tools

The tools are organized across 6 domains:

**PagerDuty:** incident search, details, response metrics, SLA tracking, team performance, on-call schedules, escalation analysis, TTR percentiles

**Jira:** release search, change management compliance, CMv2 violation lookup, deployment correlation, sprint tracking

**DataDog:** monitor health, deployment markers, SLO status, monitor coverage metrics, alert volume analysis

**Slack:** war room participation, channel activity during incidents, communication timeline

**Zoom:** incident call tracking, meeting participant analysis, response coordination metrics

**Analysis:** risk scoring, financial impact calculation, RCA similarity matching, trend analysis, leadership hierarchy resolution, cross-system correlation

Each tool follows a structured pattern. Parameters are validated before execution. Queries are parameterized BigQuery queries, not raw SQL. An LLM generating SQL against production data is a security audit nightmare, so the agent can only call predefined tools with defined input schemas. Every execution runs with timeout bounds and returns structured results with metadata.

### OrgResolver Identity System

OrgResolver is the foundational identity layer (see [IE Hub case study](/wayne-nolette/case-studies/ie-hub-platform/) for the canonical definition). When a user asks "show my team's CIs," the system resolves their Okta session to team membership to services to incidents automatically.

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

- "Show **my** team's incidents" (user's direct team)
- "Show **all teams under my director**" (leadership chain traversal)
- "Compare **Stand vs. Core** team health" (cross-team analysis)

### BigQuery Data Layer

21 tables across 6 datasets:

| Table                    | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `pd_incidents`           | PagerDuty incident records with severity, status, timestamps, responders |
| `pd_services`            | Service catalog with team ownership and tier classification              |
| `pd_teams`               | Team definitions and membership                                          |
| `pd_schedules`           | On-call schedules and coverage                                           |
| `pd_escalation_policies` | Escalation chains and policy configuration                               |
| `dd_monitors`            | DataDog monitor definitions, owners, tags, status                        |
| `dd_downtimes`           | Scheduled maintenance windows                                            |
| `dd_deployments`         | Deployment markers with timing and metadata                              |
| `jira_releases_cmg`      | Release records with change management group compliance                  |
| `jira_cmv2`              | Change management v2 violation records                                   |
| `slack_channels`         | Channel activity and participation metrics                               |
| `slack_war_rooms`        | Incident war room creation and attendance                                |
| `zoom_meetings`          | Incident-related call tracking                                           |
| `incident_costs`         | Calculated per-incident financial impact                                 |
| `salary_reference`       | Anonymized salary bands for cost modeling                                |
| `rdemp_records`          | Organizational identity and team hierarchy                               |
| `service_mappings`       | Cross-system service identifier resolution                               |
| `monitor_governance`     | Monitor health scoring and status                                        |
| `release_risk_scores`    | Predictive deployment risk calculations                                  |
| `sla_tracking`           | SLA compliance per service and team                                      |
| `cost_summaries`         | Aggregated cost data by team and quarter                                 |

### Risk Scoring Engine

The agent includes a release risk scoring engine that calculates a 0-100 risk score for deployments:

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

The agent calculates per-incident costs by correlating responder hours from PagerDuty acknowledgment to resolution, war room costs (participant count multiplied by duration from Zoom/Slack), engineering time diverted from planned work, and anonymized band-level salary data for cost modeling.

This enables leadership queries like:

- "What did Critical incidents cost my org last quarter?"
- "Which services have the highest incident cost?"
- "What's the ROI of investing in monitoring for Service X?"

## Key Decisions

### Validated Tools Over Freeform SQL

The agent executes structured tool invocations, not freeform SQL generation. Every query is parameterized (no SQL injection risk), bounded (timeout limits prevent runaway queries), auditable (tool invocations logged with timing spans), and scoped (team-level data access enforced at the query layer).

This was a deliberate tradeoff: less flexible than letting the LLM write arbitrary SQL, but far more secure and predictable in production.

### Dual LLM Strategy

Claude 4.5 Sonnet handles complex reasoning and multi-step tool orchestration. GPT-4o-mini generates user-facing suggestions (e.g., "You might also want to check..."). This separation keeps costs reasonable: the expensive model reasons, the cheap model surfaces.

### ReactAgent Over Single-Turn

A single-turn approach (query → tools → response) would be simpler but couldn't handle investigations that require chaining multiple data sources. The ReactAgent pattern allows the agent to observe intermediate results and decide whether additional tool calls are needed.

## What Was Harder Than Expected

Not all 36 tools see equal use. Incident search, cost calculation, and team summary tools handle the vast majority of queries. Some tools (like RCA similarity matching and sprint tracking) get invoked rarely. Starting with 10-15 core tools and adding based on actual usage data would have been more efficient. The remaining tools still work, but the development time front-loaded on low-usage tools could have gone to improving the high-usage ones.

The LLM also struggled with ambiguous time ranges. "Recent" means different things to different users. We added explicit time range normalization (defaulting to 90 days if unspecified) after the agent kept returning inconsistent result sets for vague queries. This was a simple fix but took us longer to identify than it should have because the failures were subtle: the agent returned results, they just weren't what the user expected.

## Results

| Capability              | Before                   | After                               |
| ----------------------- | ------------------------ | ----------------------------------- |
| Investigation time      | 30-60 min manual         | Seconds via natural language        |
| Data sources correlated | Manual cross-referencing | Automatic across 6 systems          |
| Cost visibility         | None                     | Per-incident, per-team, per-quarter |
| Risk assessment         | Ad hoc                   | Automated 0-100 scoring             |
| Identity resolution     | Tribal knowledge         | Automatic via OrgResolver           |
| Tooling                 | 0                        | 36 validated tools                  |

### Operational Impact

- Engineers investigate incidents in seconds instead of manually navigating 6 tools
- Leadership gets financial impact data without requesting custom reports
- Risk scoring flags high-risk deployments before they reach production
- OrgResolver eliminates the "who owns this service?" question
- Every investigation is logged and auditable

## Lessons

### Would Repeat

**Building OrgResolver before the agent.** Identity resolution is the foundation everything else depends on. Without it, every query would require the user to specify exact team names, service IDs, and time ranges. With it, "show my team's CIs" just works.

**Structured tool framework with input validation.** Treating every tool as a validated function with defined input schemas prevented entire categories of bugs. The upfront discipline of defining schemas for all 36 tools paid off immediately in production stability.

**Dual LLM strategy.** Using Claude for reasoning and GPT-4o-mini for suggestions keeps costs manageable. The suggestion model adds significant UX value at minimal incremental cost.

### Would Avoid

**Building all 36 tools before user validation.** Some tools see daily use (incident search, cost calculation), while others are rarely invoked. Starting with core tools and adding based on actual usage patterns would have been more efficient.

**Underestimating data normalization.** Service names differ between PagerDuty, DataDog, and Jira. Building the `service_mappings` table required significant effort to reconcile naming conventions across systems.
