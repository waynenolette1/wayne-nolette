---
title: 'OpsieBot: AI-Powered Governance Automation'
description: 'Slack bot using Claude AI for natural language parsing to automate PagerDuty team renames via Terraform. Generates GitHub PRs with atomic changes across team resources, schedules, and escalation policies with duplicate validation.'
order: 4
role: 'Technical Operations Manager II'
duration: '3 months'
outcome: 'Automated PagerDuty team governance, eliminating manual Terraform changes'
tech:
  [
    'Claude AI',
    'Slack Socket Mode',
    'Python',
    'Terraform',
    'GitHub API',
    'PagerDuty',
  ]
skills:
  [
    'developer-experience',
    'systems-design',
    'reliability',
    'technical-leadership',
  ]
metrics:
  primary: 'AI Automation'
  secondary: 'Atomic PRs'
ownership: 'Designed and built the entire bot — Slack integration, Claude AI parsing, Terraform mutation logic, GitHub PR creation, and duplicate validation. Sole owner and operator.'
---

## Context

PagerDuty team renames at ZoomInfo were a governance headache. When a team needed to rename — due to org changes, rebranding, or structural realignment — the process required:

1. Find the team definition in Terraform
2. Update the team name
3. Find and update all associated schedules referencing the team
4. Find and update all escalation policies referencing the team
5. Verify no other resources reference the old name
6. Create a PR, get it reviewed, merge, and apply

This was manual, error-prone, and frequently incomplete — engineers would rename the team but miss updating schedules or escalation policies, causing broken on-call configurations.

I built OpsieBot — a Slack bot that automates this entire workflow using Claude AI for natural language parsing.

## Technical Architecture

```
OpsieBot Flow:

┌─────────────────────────────────────────────┐
│  Slack (Socket Mode)                        │
│    User: "rename Team Alpha to Team Beta"   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Claude AI (Natural Language Parsing)       │
│    Extract: old_name, new_name, scope       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Validation Layer                           │
│    Duplicate check, team existence verify   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Terraform Mutation Engine                  │
│    Team + Schedules + Escalation Policies   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  GitHub PR Creation                         │
│    Atomic PR with all changes + description │
└─────────────────────────────────────────────┘
```

### Slack Integration (Socket Mode)

OpsieBot runs in Slack Socket Mode — a persistent WebSocket connection that doesn't require a public HTTP endpoint. Users interact with it via direct messages or channel mentions:

- `@OpsieBot rename "Platform Engineering" to "Infrastructure Engineering"`
- `@OpsieBot rename team Alpha to team Beta`
- `@OpsieBot change PagerDuty team name from X to Y`

The bot acknowledges immediately, processes asynchronously, and reports results back to the user.

### Claude AI Parsing Layer

Rather than building rigid command parsers, OpsieBot uses Claude AI to understand natural language rename requests. The AI extracts:

- **Old team name** — the current PagerDuty team name
- **New team name** — the desired replacement
- **Scope** — whether to include schedules and escalation policies (default: all)

This handles natural variations in how people phrase requests without requiring exact command syntax. Users don't need to remember a specific format — they just describe what they want.

### Validation Safeguards

Before making any changes, OpsieBot validates:

1. **Team exists** — verifies the old team name matches a Terraform resource
2. **No duplicate** — checks that the new team name doesn't already exist
3. **No pending PRs** — ensures there isn't already an open PR for this team rename
4. **Name format** — validates the new name follows PagerDuty naming conventions

If any validation fails, the bot reports the specific issue back to the user with actionable guidance.

### Terraform Mutation Engine

The core logic performs atomic Terraform file mutations:

**Team Resource Update**

- Locates the `pagerduty_team` resource by current name
- Updates the `name` attribute to the new value
- Preserves all other team configuration (description, parent team)

**Schedule Updates**

- Finds all `pagerduty_schedule` resources that reference the team
- Updates team references in schedule layers
- Preserves schedule configuration (rotation, restrictions, overrides)

**Escalation Policy Updates**

- Finds all `pagerduty_escalation_policy` resources referencing the team
- Updates team target references in escalation rules
- Preserves policy configuration (num_loops, rule ordering)

All changes are atomic — either all files are updated or none are. This prevents the partial-update problem where a team name is changed but associated schedules still reference the old name.

### GitHub PR Creation

OpsieBot creates a GitHub PR with:

- **Descriptive title** — "Rename PagerDuty team: Old Name → New Name"
- **Comprehensive body** — lists all files changed, resources affected, and the user who requested the change
- **Atomic changeset** — all Terraform modifications in a single commit
- **Labels** — auto-tagged for review routing

The PR goes through the standard review and merge process, maintaining the existing governance workflow. OpsieBot automates the tedious file changes; humans still review and approve.

## Key Decisions

### Claude AI Over Regex Parsing

A regex-based command parser would be simpler but brittle. Users phrase rename requests in many ways:

- "rename team X to Y"
- "change the name of X to Y"
- "update PagerDuty team X → Y"
- "can you rename X to Y please?"

Claude handles all of these naturally. The cost per parse is negligible (single short prompt), and the flexibility dramatically improves user experience.

### Atomic PRs Over Incremental Changes

The alternative was making changes incrementally — rename the team, then update schedules, then update policies. This creates a window where the configuration is inconsistent.

Atomic PRs ensure every rename is all-or-nothing. The Terraform state is always consistent after merge.

### Socket Mode Over HTTP Webhooks

Slack Socket Mode was chosen because:

- **No public endpoint required** — simpler security posture
- **Persistent connection** — faster response times
- **Easier deployment** — runs as a background process, no ingress configuration

### Validation Before Mutation

Every rename goes through validation before any files are touched. This prevents:

- **Duplicate team names** — which would cause Terraform conflicts
- **Missing teams** — typos in the old name caught early
- **Concurrent renames** — duplicate PR detection prevents conflicting changes

## Results

| Metric          | Before                          | After                               |
| --------------- | ------------------------------- | ----------------------------------- |
| Time per rename | 30-60 minutes manual            | ~30 seconds automated               |
| Files missed    | Frequent (schedules, policies)  | Zero (atomic changes)               |
| Consistency     | Partial updates common          | Always atomic                       |
| Error rate      | Manual typos, missed references | Validated before execution          |
| Audit trail     | Git blame archaeology           | Clear PR with requester attribution |

### Operational Impact

- **Eliminated manual Terraform editing** for team renames
- **Zero partial updates** — atomic PRs prevent broken on-call configurations
- **Faster turnaround** — requests completed in seconds instead of waiting for an engineer
- **Better governance** — every change goes through PR review with clear attribution
- **Reduced cognitive load** — engineers don't need to remember which files to update

## Lessons

### Would Repeat

**Using Claude AI for natural language parsing.** The flexibility is worth the minimal cost. Users don't need to learn a command syntax — they describe what they want and it works. This dramatically improved adoption.

**Atomic changesets.** Making all Terraform changes in a single commit/PR eliminated the class of bugs where partial updates leave configuration in an inconsistent state. This should be the default pattern for any multi-file governance automation.

**Validation before mutation.** Catching errors before touching any files means the bot never creates a broken PR. The validation layer is cheap to run and prevents expensive cleanup.

### Would Avoid

**Not adding dry-run mode from the start.** Users wanted to preview changes before the PR was created. Adding a `--dry-run` flag was a quick addition but should have been there from day one.

**Hardcoding Terraform file patterns.** The initial version assumed a specific directory structure for Terraform files. When the structure changed, the bot needed updating. A more configurable approach to file discovery would have been more resilient.
