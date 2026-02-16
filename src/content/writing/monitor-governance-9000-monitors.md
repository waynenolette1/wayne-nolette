---
title: 'Monitor Governance at Scale: 9,000+ DataDog Monitors'
description: 'How I built a governance system for 9,000+ monitors: tracking ownership, staleness, health scoring, and compliance across Infrastructure Engineering.'
pubDate: 2025-10-02
tags: ['datadog', 'governance', 'operations', 'platform']
draft: false
confidenceLevel: high
project: 'ie-hub-platform'
---

**TL;DR**: 9,000+ DataDog monitors with unclear ownership, inconsistent naming, and significant staleness. I built a system that syncs monitor metadata to BigQuery, scores health, tracks ownership via OrgResolver, and shows which monitors are stale, unowned, or misconfigured. The biggest win: identifying 2,000+ stale monitors that hadn't fired in 6+ months, consuming evaluation cycles while creating false confidence.

## The Problem

DataDog monitors accumulate. Every incident response creates a few. Every new service deployment adds monitoring. But monitors rarely get cleaned up.

After two years of organic growth:

- **9,000+ monitors** across Infrastructure Engineering
- **No clear ownership** for ~30% of monitors. The creator left the team, the service changed names, the team reorganized.
- **Significant staleness.** Monitors for deprecated services still running, consuming evaluation quota.
- **Inconsistent naming.** No standard format, making it impossible to identify a monitor's purpose from its name alone.
- **No visibility** into the overall health of our monitoring estate.

## The Sync Pipeline

A Cloud Run service syncs monitor metadata from DataDog's API to BigQuery every 15 minutes:

- Monitor name, ID, type, query
- Tags (including team, service, environment tags)
- Current status (OK, Alert, Warn, No Data)
- Creator, last modified timestamp
- Mute status, downtime associations

The sync is incremental: only monitors modified since the last sync are updated. Full reconciliation runs daily to catch any missed changes.

## Health Scoring

Each monitor receives a health score based on:

- **Has owner?** Is the monitor tagged with a valid team? (OrgResolver validates team existence)
- **Recently fired?** Has the monitor triggered in the last 6 months?
- **Naming convention?** Does the monitor name follow the standard format?
- **Appropriate severity?** Is the alert severity consistent with the service tier?
- **Not permanently muted?** Muted monitors that stay muted for >30 days are flagged.

Monitors with low health scores surface at the top of the dashboard, giving teams a prioritized cleanup list.

## Staleness Detection

The most impactful finding: 2,000+ monitors hadn't fired in over 6 months. These fall into three categories:

1. **Deprecated service monitors.** The service was decommissioned but the monitors weren't deleted.
2. **Threshold too high.** The alert threshold is set above any realistic value, so it never fires.
3. **Duplicate monitors.** Multiple monitors checking the same condition, but only one is configured correctly.

Stale monitors are worse than no monitors. They create false confidence ("we have monitoring") without providing actual alerting. And they consume DataDog's evaluation quota, potentially slowing evaluation of monitors that actually matter.

## The Dashboard

The Monitor Tracking page in IE Hub shows:

- **Overall health score** per team, calculated as percentage of monitors meeting all criteria
- **Stale monitor list:** monitors that haven't fired in 6+ months, sorted by age
- **Unowned monitors:** monitors without a valid team tag
- **Naming violations:** monitors that don't follow the standard format
- **Mute abuse:** monitors muted for >30 days

Each issue links directly to the DataDog monitor page for quick remediation. Teams can export their report as CSV for sprint planning.

## What I'd Do Differently

**Automate stale monitor cleanup.** Currently, the system identifies stale monitors and surfaces them for manual review. Automating deletion of monitors for confirmed-deprecated services would reduce the manual burden. The hesitation: deleting a monitor that turns out to be needed is worse than keeping a stale one. I'd add a "soft delete" (mute + tag) with a 30-day grace period before actual deletion.
