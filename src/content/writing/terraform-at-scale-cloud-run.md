---
title: 'Terraform at Scale: Managing 16+ Cloud Run Services'
description: 'How I structured Terraform modules for 16+ Cloud Run sync services across dev/stg/prd. Standardized modules, least-privilege IAM, and the Jenkins pipeline that ties it together.'
pubDate: 2025-08-12
tags: ['terraform', 'gcp', 'infrastructure', 'devops']
draft: false
confidenceLevel: high
project: 'gcp-infrastructure'
---

**TL;DR**: IE Hub runs on 16+ Cloud Run services, each with its own service account, Cloud Scheduler job, and BigQuery dataset permissions. Managing this across 3 environments without Terraform would be chaos. I built standardized modules that let me spin up a new service in ~20 lines of config. The key: least-privilege IAM at the dataset level, not the project level.

## The Scale Problem

Each sync service needs:

- A Cloud Run service definition
- A dedicated service account
- IAM bindings to specific BigQuery datasets
- A Cloud Scheduler job for automated execution
- Environment-specific configuration (dev/stg/prd)

That's 5 resources per service × 16 services × 3 environments = 240 Terraform resources. Without modules, this would be ~5,000 lines of repetitive HCL.

## Standardized Modules

I created 4 reusable modules:

**`cloud_run_service`:** container image, CPU/memory limits, environment variables, health check endpoint, min/max instances.

**`service_account`:** creates the account, assigns BigQuery roles scoped to specific datasets, optionally adds Cloud Run invoker permissions for service-to-service calls.

**`scheduler_job`:** cron expression, HTTP target (Cloud Run URL), OIDC authentication using the service's own service account, retry configuration.

**`bigquery_dataset`:** dataset creation with IAM bindings, table expiration defaults, location constraints.

Adding a new service:

```hcl
module "jira_sync" {
  source        = "./modules/cloud_run_service"
  name          = "jira-release-sync"
  image         = "us-docker.pkg.dev/${var.project}/governance/jira-sync:${var.image_tag}"
  service_account = module.jira_sync_sa.email
  env_vars = {
    BIGQUERY_DATASET = "jira_governance"
    SYNC_INTERVAL    = "30m"
  }
}

module "jira_sync_sa" {
  source   = "./modules/service_account"
  name     = "jira-sync"
  datasets = ["jira_governance"]
  roles    = ["roles/bigquery.dataEditor"]
}

module "jira_sync_scheduler" {
  source   = "./modules/scheduler_job"
  name     = "jira-release-sync"
  schedule = "*/30 * * * *"
  target   = module.jira_sync.url
  sa_email = module.jira_sync_sa.email
}
```

~20 lines. New service running in dev within minutes.

## Least-Privilege IAM: Dataset-Level, Not Project-Level

The easy approach: give every service account `roles/bigquery.dataEditor` at the project level. One binding, done.

I rejected this because it means the PagerDuty sync service can write to the Jira dataset. The Slack sync service can modify incident cost data. Any compromised service has access to everything.

Instead, every service account gets BigQuery roles scoped to specific datasets:

- `jira-sync-sa` → `bigquery.dataEditor` on `jira_governance` only
- `pd-sync-sa` → `bigquery.dataEditor` on `pd_governance` only
- `cost-calc-sa` → `bigquery.dataEditor` on `cost_governance`, `bigquery.dataViewer` on `pd_governance` (needs to read incidents for cost calculation)

More Terraform configuration upfront. Significantly better security posture.

## Environment Strategy

Three environments with intentional differences:

**dev:** reduced scheduler frequency (hourly instead of every 15 minutes), single Cloud Run instance, relaxed resource limits. Saves compute costs during development.

**stg:** production-like configuration, full scheduler frequency, used for integration testing before promotion.

**prd:** full configuration, auto-scaling, monitoring alerts.

Environment selection is a single variable (`var.environment`) that propagates through all modules. Scheduler frequencies, instance counts, and resource limits are all environment-aware.

## The Jenkins Pipeline

```
Developer pushes → Jenkins builds → Docker image → Artifact Registry
                                                          ↓
                                            Terraform plan (review)
                                                          ↓
                                            Terraform apply (deploy)
                                                          ↓
                                            Health check verification
```

Environment promotion is manual and deliberate. Dev deploys automatically on merge. Stg and prd require explicit approval. This prevents accidental production deployments while keeping the dev cycle fast.

## What I'd Do Differently

**Add Terraform drift detection from day one.** Other teams occasionally made changes via the Cloud Console that Terraform didn't know about. Scheduled `terraform plan` runs would have caught this drift early instead of discovering it during the next deployment.

**Use Terraform workspaces or separate state files per environment.** I started with a single state file and environment variables. This worked but made concurrent dev/prd operations occasionally contend on state locks. Separate state files per environment would eliminate this.
