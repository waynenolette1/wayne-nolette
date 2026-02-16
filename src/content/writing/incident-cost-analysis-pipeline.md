---
title: 'Quantifying Incident Costs: From Engineer Time to Financial Impact'
description: 'How I built a financial impact pipeline that calculates per-incident costs from responder time, war room meetings, and salary data. Turning incident prevention into a business case.'
pubDate: 2025-11-05
tags: ['data-engineering', 'bigquery', 'operations', 'cost']
draft: false
confidenceLevel: high
project: 'ie-hub-platform'
---

**TL;DR**: "Incidents cost money" is obvious. "This incident cost $47,000" is actionable. I built a pipeline that calculates per-incident financial impact by correlating PagerDuty responder data, Slack/Zoom war room participation, and anonymized salary reference bands. The result: leadership can now make ROI-driven decisions about investing in incident prevention.

## Why Financial Impact Matters

Engineering teams talk about incidents in operational terms: severity, TTR, blast radius. Leadership thinks in financial terms: cost, ROI, investment prioritization.

Without financial data, the conversation is:

> "We should invest in monitoring for Service X."
> "Why?"
> "It has a lot of incidents."
> "How many?"
> "A lot."

With financial data:

> "Service X incidents cost $180K last quarter. A $50K investment in monitoring would reduce incident frequency by an estimated 40%, saving $72K per quarter."

That's a conversation leadership can act on.

## The Cost Model

Per-incident cost is calculated from three components:

**Responder Time:** Engineer hours from PagerDuty acknowledgment to resolution. Source: PagerDuty incident timeline. Each responder's time is valued at their salary band's hourly rate.

**War Room Cost:** Meeting participant count × duration. Source: Slack war room creation events + Zoom meeting participant lists. Each participant's time is valued at their salary band's hourly rate.

**Opportunity Cost:** Engineering time diverted from planned work. Calculated as a multiplier on direct responder time (currently 1.5x) to account for context switching, interrupted sprints, and downstream delays.

```
incident_cost = responder_cost + war_room_cost + opportunity_cost

responder_cost = Σ(responder_hours × hourly_rate)
war_room_cost  = Σ(participant_hours × hourly_rate)
opportunity_cost = responder_cost × 1.5
```

## Salary Reference: Anonymized Band-Level Data

I don't use individual salaries. The `salary_reference` table contains anonymized salary bands:

| Band | Role Pattern             | Hourly Rate |
| ---- | ------------------------ | ----------- |
| IC3  | Software Engineer        | $X/hr       |
| IC4  | Senior Software Engineer | $Y/hr       |
| IC5  | Staff Engineer           | $Z/hr       |
| M1   | Engineering Manager      | $A/hr       |
| M2   | Senior Manager           | $B/hr       |

OrgResolver maps each incident responder and war room participant to their salary band. The cost calculation uses the band rate, not individual compensation. This provides sufficient accuracy for financial modeling while respecting privacy.

## Aggregation Views

The pipeline produces cost data at multiple aggregation levels:

- **Per-incident:** "CI-3285 cost $47,000"
- **Per-team per quarter:** "Team Alpha's incidents cost $180K in Q3"
- **Per-service:** "Service X has the highest incident cost"
- **Per-severity:** "Critical incidents average $35K; High incidents average $12K"
- **Trend:** "Incident costs decreased 15% quarter-over-quarter"

These aggregations power the Incident Cost Analytics page in IE Hub and are queryable via the AI agent.

## What Changed After We Had Cost Data

Three things happened immediately:

1. **Budget conversations included incident cost.** When planning monitoring investments, teams could cite specific cost figures rather than abstract severity counts.

2. **High-cost services got attention.** Services with low incident frequency but high per-incident cost (long TTR, many responders) were previously invisible. Cost data surfaced them.

3. **War room discipline improved.** When teams saw that a 15-person war room for 2 hours costs more than the incident itself, they started scoping war rooms to essential participants.
