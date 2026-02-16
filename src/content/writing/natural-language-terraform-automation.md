---
title: 'Natural Language Terraform Automation with Claude AI'
description: 'How OpsieBot uses Claude AI to parse Slack messages into atomic Terraform changes. Why validation before mutation prevents entire categories of bugs.'
pubDate: 2025-07-18
tags: ['ai', 'terraform', 'automation', 'slack']
draft: false
confidenceLevel: high
project: 'opsiebot'
---

**TL;DR**: PagerDuty team renames required manually editing 3-5 Terraform files. Engineers frequently missed updating schedules or escalation policies, breaking on-call configurations. I built OpsieBot, a Slack bot that parses natural language rename requests with Claude AI, validates everything, and creates atomic GitHub PRs. Time per rename: 30-60 minutes → 30 seconds. Partial updates: frequent → zero.

## Why This Problem Mattered

A PagerDuty team rename sounds trivial. Change one string in one file. But in Terraform, a team name propagates:

1. **Team resource:** the `pagerduty_team` definition
2. **Schedules:** every `pagerduty_schedule` that references the team
3. **Escalation policies:** every `pagerduty_escalation_policy` with the team as a target

Miss one reference and Terraform apply fails, or worse, silently creates a broken on-call configuration where pages don't reach the right people.

Engineers did this manually. They'd grep for the old name, update what they found, and hope they didn't miss anything. They frequently did.

## Claude AI Over Regex Parsing

Users phrase rename requests in many ways:

- "rename Team Alpha to Team Beta"
- "change the name of Platform Eng to Infrastructure Eng"
- "can you update PagerDuty team X → Y please?"
- "rename X to Y"

A regex parser would need patterns for every variation. I'd constantly be adding new patterns as users found new ways to phrase requests.

Claude AI handles all of these naturally. The prompt is simple: extract the old team name and new team name from the user's message. The cost per parse is a fraction of a cent (single short prompt), and the flexibility improves user experience considerably.

## Validation Before Mutation

Every rename goes through 4 validation checks before any files are touched:

1. **Team exists:** the old name matches a `pagerduty_team` resource in Terraform
2. **No duplicate:** the new name doesn't already exist as a team
3. **No pending PRs:** there isn't already an open PR for this team
4. **Name format:** the new name follows PagerDuty conventions

If any check fails, the bot reports the issue back in Slack with actionable guidance. No files are touched. No broken PRs are created.

This validation-first pattern prevents entire categories of bugs. The most common: typos in the old team name. Without validation, the bot would create a PR that adds a new team instead of renaming the existing one. With validation, it catches the typo immediately.

## Atomic Changesets

The Terraform mutation engine collects all file changes (team resource, schedules, escalation policies) into a single Git commit. The GitHub PR contains every change needed for the rename. Either all changes are applied or none are.

This eliminates the partial-update problem that plagued manual renames. You can't accidentally rename the team but forget to update the schedule, because the PR includes both.

## The PR as a Review Gate

OpsieBot doesn't apply Terraform changes directly. It creates a PR. The PR goes through the standard review and merge process, the same review gate as any other infrastructure change.

This was deliberate. The bot automates the tedious file editing. Humans still review and approve. The audit trail is clear: who requested the rename (Slack message), what changed (PR diff), who approved it (PR reviewer).

## Results

| Metric           | Before     | After                   |
| ---------------- | ---------- | ----------------------- |
| Time per rename  | 30-60 min  | ~30 seconds             |
| Files missed     | Frequent   | Zero (atomic)           |
| On-call breakage | Occasional | Zero                    |
| Audit trail      | Git blame  | Clear PR with requester |
