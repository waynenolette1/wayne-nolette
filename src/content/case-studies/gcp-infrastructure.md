---
title: 'GCP Infrastructure: Terraform-Managed Platform Services'
description: 'Terraform-managed GCP infrastructure for 16+ Cloud Run services with dedicated service accounts, Cloud Scheduler automation, and BigQuery datasets across 7 data domains. Jenkins to Artifact Registry to Cloud Run pipeline across dev/stg/prd.'
order: 3
role: 'Technical Operations Manager II'
duration: '10+ months'
outcome: '16+ Cloud Run services, 7 data domains, 3-environment deployment pipeline'
tech:
  [
    'Terraform',
    'GCP',
    'Cloud Run',
    'BigQuery',
    'Cloud Scheduler',
    'Jenkins',
    'Artifact Registry',
  ]
skills:
  ['systems-design', 'reliability', 'cost-optimization', 'technical-leadership']
metrics:
  primary: '16+ Cloud Run Services'
  secondary: '7 Data Domains'
ownership: 'Designed the entire Terraform architecture: module structure, service account model, dataset permissions, Cloud Scheduler configuration, and CI/CD pipeline. Sole infrastructure owner for the IE Hub platform.'
---

## Context

IE Hub required a reliable, repeatable infrastructure foundation. The platform integrates with 6+ external data sources (DataDog, PagerDuty, Jira, Slack, Zoom, Backstage) and needs 16+ microservices to sync, transform, and serve this data. Each service has its own schedule, permissions, and data access requirements.

Without Infrastructure as Code, managing this would be:

- Error-prone: manual Cloud Console changes across 3 environments
- Inconsistent: dev/stg/prd drift as ad hoc changes accumulate
- Unauditable: no record of what changed, when, or why
- Slow: new services require manual setup of Cloud Run, service accounts, IAM, schedulers

I built a Terraform infrastructure that manages everything declaratively, deployed through an automated Jenkins pipeline.

## Technical Architecture

```
Infrastructure Stack:

┌─────────────────────────────────────────────┐
│  Terraform Cloud (Remote State)             │
│    State locking, plan/apply separation     │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Terraform Modules                          │
│    Cloud Run · BigQuery · IAM · Scheduler   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  CI/CD Pipeline                             │
│    Jenkins → Artifact Registry → Cloud Run  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Environments                               │
│    dev · stg · prd                          │
└─────────────────────────────────────────────┘
```

### Cloud Run Services (16+)

The infrastructure manages 16+ Cloud Run services across 7 data domains:

**PagerDuty Sync Domain**

- Incident sync service: pulls incident data on schedule
- Service catalog sync: maintains service-to-team mappings
- Team and schedule sync: organizational structure updates
- Escalation policy sync: policy configuration tracking

**Jira Integration Domain**

- Release sync service: change management group records
- CMv2 violation tracker: compliance monitoring
- Sprint and project tracking: planning data correlation

**DataDog Monitoring Domain**

- Monitor sync service: 9,000+ monitor definitions and status
- Deployment marker sync: release timing correlation
- SLO tracking service: objective compliance data

**Slack/Zoom Tracking Domain**

- War room tracker: incident communication analysis
- Channel activity sync: team communication patterns
- Meeting participant sync: incident call tracking

**Incident Cost Analysis Domain**

- Cost calculation service: per-incident financial impact
- Salary reference sync: cost modeling data

**Organizational Identity Domain**

- OrgResolver sync: employee records and team hierarchy
- Service mapping resolver: cross-system identifier normalization

**AI Agent Domain**

- CI Analysis Agent service: the AI investigation engine

Each Cloud Run service follows a standardized pattern:

- Container image from Artifact Registry
- Dedicated service account with least-privilege IAM
- Cloud Scheduler trigger for automated execution
- BigQuery dataset access scoped to required tables only
- Environment-specific configuration (dev/stg/prd)

### Service Account Model

Every Cloud Run service runs with its own dedicated service account. Each account gets only the BigQuery roles it needs (specific datasets and tables), Cloud Run invoker permissions only for services that call other services, and no cross-domain access. PagerDuty sync services can't read Jira data.

This least-privilege model contains blast radius. If a single service is compromised, it can only access its specific data domain.

### BigQuery Dataset Architecture

Terraform manages BigQuery datasets with IAM bindings at the dataset level:

```
BigQuery Datasets (Terraform-managed):

pd_governance/        → PagerDuty incident, service, team data
  ├── pd_incidents
  ├── pd_services
  ├── pd_teams
  ├── pd_schedules
  └── pd_escalation_policies

jira_governance/      → Release and compliance data
  ├── jira_releases_cmg
  └── jira_cmv2

dd_governance/        → Monitor and deployment data
  ├── dd_monitors
  ├── dd_downtimes
  └── dd_deployments

comms_governance/     → Communication tracking
  ├── slack_channels
  ├── slack_war_rooms
  └── zoom_meetings

cost_governance/      → Financial impact data
  ├── incident_costs
  ├── salary_reference
  └── cost_summaries

org_governance/       → Identity and ownership
  ├── rdemp_records
  ├── service_mappings
  └── monitor_governance

analytics_governance/ → Derived analysis
  ├── release_risk_scores
  └── sla_tracking
```

### Cloud Scheduler Automation

Each sync service has a Cloud Scheduler job managed by Terraform:

- **PagerDuty sync:** every 15 minutes for incidents, hourly for services/teams
- **Jira sync:** every 30 minutes for releases, hourly for compliance
- **DataDog sync:** every 15 minutes for monitors, real-time for deployments
- **Cost calculation:** daily batch processing
- **OrgResolver sync:** daily for organizational hierarchy

Schedules are environment-specific. Dev runs less frequently to save costs; prd runs at full cadence.

### CI/CD Pipeline

```
Deployment Pipeline:

Developer pushes code
    ↓
Jenkins triggers build
    ↓
Docker image built
    ↓
Image pushed to Artifact Registry
    ↓
Terraform plan (review changes)
    ↓
Terraform apply (deploy to target environment)
    ↓
Cloud Run service updated
    ↓
Health check verification
```

The pipeline supports environment promotion (dev → stg → prd with manual approval gates), rollback via previous image tags in Artifact Registry, Terraform plan review before apply, and remote state management via Terraform Cloud for state locking and history.

## Key Decisions

### Terraform Over Manual Configuration

With 16+ services, 20+ service accounts, 7 BigQuery datasets, and 15+ Cloud Scheduler jobs, all replicated across 3 environments, manual management was not realistic. Terraform provides reproducibility (exact same infrastructure in dev/stg/prd), auditability (Git history shows every change), review process (PR-based changes with plan output), and recovery (recreate entire infrastructure from code if needed).

### Standardized Cloud Run Modules

Rather than writing per-service Terraform, I created reusable modules:

- `cloud_run_service`: standard service definition with health checks
- `service_account`: least-privilege account with domain-scoped roles
- `scheduler_job`: cron-triggered HTTP invocation
- `bigquery_dataset`: dataset with IAM bindings

Adding a new sync service requires ~20 lines of Terraform: module references with service-specific parameters.

### Dataset-Level IAM Over Project-Level

Granting BigQuery access at the dataset level (not project level) ensures services only read the data they need. This required more Terraform configuration upfront but prevents accidental cross-domain data access.

## What Was Harder Than Expected

Terraform drift from manual Cloud Console changes was a recurring problem. Other teams occasionally modified resources directly in the console, and Terraform didn't know about it until the next plan showed unexpected diffs. We added scheduled `terraform plan` runs to detect drift, but it should have been there from day one. The gap between "everything in Terraform" and "everything actually managed by Terraform" is wider than you'd expect in an organization with shared GCP projects.

The other challenge was Cloud Scheduler timezone handling. Dev and prd run in different regions, and scheduler cron expressions required explicit timezone configuration. Without it, sync jobs fired at unexpected times and produced misleading data freshness gaps.

## Results

| Metric                  | Before                 | After                           |
| ----------------------- | ---------------------- | ------------------------------- |
| Service deployment      | Manual, error-prone    | Automated pipeline              |
| Environment consistency | Frequent drift         | Identical via Terraform         |
| New service setup       | Hours of manual config | ~20 lines of Terraform          |
| IAM management          | Ad hoc permissions     | Least-privilege, auditable      |
| Scheduler management    | Manual Cloud Console   | Declarative, version-controlled |
| Infrastructure recovery | Undocumented           | Full recreation from code       |

### Operational Impact

- Dev/stg/prd are guaranteed identical. Zero-drift deployments.
- New sync services deployed in minutes, not hours
- Every infrastructure change tracked in Git with PR review
- Environment-specific scheduler cadence saves unnecessary compute costs
- Least-privilege service accounts with no cross-domain access

## Lessons

### Would Repeat

**Standardized modules from day one.** The reusable Cloud Run module paid for itself immediately. Every new service follows the same pattern: same health checks, same logging, same service account model. Consistency at the infrastructure level prevents entire categories of production issues.

**Remote state with Terraform Cloud.** State locking prevented concurrent modification issues. Plan/apply separation with remote state made the review process reliable.

**Dataset-level IAM.** More configuration upfront, but the security posture is significantly better. When we onboarded the AI agent, scoping its BigQuery access to specific datasets was trivial because the permission model was already granular.

### Would Avoid

**Not implementing drift detection earlier.** We discovered manual Cloud Console changes (by other teams) that Terraform didn't know about. Scheduled `terraform plan` runs would have caught these before they caused confusing plan diffs.

**Assuming shared GCP projects mean shared Terraform discipline.** Other teams with access to the same project don't always know (or care) that resources are Terraform-managed. Clear resource naming conventions and project-level documentation help, but organizational alignment is the real fix.
