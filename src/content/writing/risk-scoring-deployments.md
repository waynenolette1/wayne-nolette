---
title: 'Predictive Risk Scoring for Deployments'
description: 'How I built a 0-100 risk scoring engine that correlates deployment speed, change management violations, and historical incident data to flag risky releases before they hit production.'
pubDate: 2025-12-03
tags: ['data-engineering', 'bigquery', 'risk', 'operations']
draft: false
confidenceLevel: high
project: 'ci-analysis-agent'
---

**TL;DR**: Not all deployments carry equal risk. A Friday afternoon release with change management violations from a team with high historical incident rates is categorically different from a Monday morning release that followed process. I built a 0-100 risk scoring engine that quantifies this, correlating deployment speed, compliance history, and incident data to flag high-risk releases before production impact.

## The Inputs

The risk score is calculated from 5 weighted signals:

**Deployment Speed** (weight: 25%): How fast was this release compared to the team's baseline? Releases that are significantly faster than normal often indicate skipped steps (testing, staging validation, change management review). Measured as standard deviations from the team's mean deployment duration.

**Change Management Violations** (weight: 30%): Did this release follow the change management process? CMv2 violations (deploying without approval, skipping required reviewers, bypassing freeze windows) are the strongest predictor of post-deployment incidents. Binary plus severity weighting.

**Historical Incident Rate** (weight: 20%): What is this team's incident rate in the 90 days following previous deployments? Teams with high post-deployment incident rates carry more risk per release. Measured as incidents per deployment, normalized by team size.

**Change Scope** (weight: 15%): How many services are affected by this release? Multi-service deployments carry compounding risk. A single-service release affects one blast radius; a 5-service release creates cross-service dependency risks.

**Time of Day** (weight: 10%): Off-hours deployments (evenings, weekends, holidays) carry higher risk due to reduced on-call coverage and slower response times. Empirically validated: our incident data shows 1.8x higher incident rate for off-hours deployments.

## The Score

```
Score = w1(deployment_speed_z) +
        w2(cm_violation_severity) +
        w3(historical_incident_rate) +
        w4(service_count_factor) +
        w5(time_risk_factor)

Risk Classification:
  0-30:  Low risk      (proceed normally)
  31-60: Medium risk   (review recommended)
  61-80: High risk     (approval required)
  81-100: Critical     (block recommended)
```

Each input is normalized to a 0-100 scale before weighting. The weights were calibrated against 6 months of historical deployment-to-incident data. I ran a logistic regression to identify which signals best predicted post-deployment incidents, then converted the coefficients to interpretable weights.

## Data Sources

The scoring engine queries two primary BigQuery tables:

- **`jira_releases_cmg`:** release records with change management group compliance data, deployment timestamps, and scope metadata
- **`dd_cmv2`:** change management v2 violation records with severity classification

And correlates against:

- **`pd_incidents`:** historical incident records for post-deployment incident rate calculation
- **`pd_services`:** service-to-team mapping for team-level aggregation

## Integration with the AI Agent

The risk scoring engine is exposed as a tool in the CI Analysis Agent. Engineers can ask:

- "What's the risk score for the latest release?"
- "Show me high-risk deployments this quarter"
- "Which teams have the most high-risk releases?"

The agent calls the `calculate_risk_score` tool, which executes the scoring algorithm against BigQuery and returns the score with a breakdown of contributing factors.

This makes risk visible without requiring engineers to manually check multiple systems. The score surfaces automatically in the Team Hub dashboard alongside other operational metrics.

## What Surprised Me

**Change management violations were 2x more predictive than I expected.** I initially weighted CM violations at 20%. After calibration against historical data, the optimal weight was 30%, making it the single strongest predictor of post-deployment incidents. Teams that skip change management cause incidents at a significantly higher rate.

**Time-of-day risk was real but smaller than folklore suggested.** Engineers often say "never deploy on Friday." The data showed a 1.8x increase in off-hours incident rate, meaningful but not the dramatic difference folklore implies. Friday deployments that followed change management were actually fine. Friday deployments that violated change management were disasters.
