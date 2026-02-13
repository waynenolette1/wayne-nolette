#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { question, closeReadline, slugify, escapeYaml } from './shared.mjs';
import { BASE_PATH } from '../site.config.mjs';

async function main() {
  console.log('\n📊 Create New Case Study\n');

  const title = await question('Title: ');
  const description = await question('Description: ');
  const role = await question('Role: ');
  const duration = await question('Duration: ');
  const outcome = await question('Outcome: ');
  const orderInput = await question(
    'Order (number, lower = higher priority): '
  );
  const order = parseInt(orderInput, 10) || 10;

  const slug = slugify(title);

  const frontmatter = `---
title: "${escapeYaml(title)}"
description: "${escapeYaml(description)}"
order: ${order}
role: "${escapeYaml(role)}"
duration: "${escapeYaml(duration)}"
outcome: "${escapeYaml(outcome)}"
---

## Context

Describe the problem and business context here...

## Technical Approach

### Architecture Overview

\`\`\`mermaid
flowchart TD
    A[Component A] --> B[Component B]
    B --> C[Component C]
\`\`\`

### Key Implementation Details

...

## Key Decisions

### Decision 1

Why you made this choice...

## Results

| Metric | Before | After |
|--------|--------|-------|
| Metric 1 | X | Y |
| Metric 2 | X | Y |

## Lessons Learned

### Would Repeat

...

### Would Avoid

...

---

*Related: [Link to related content](/path/)*
`;

  const filePath = path.join(
    process.cwd(),
    'src',
    'content',
    'case-studies',
    `${slug}.md`
  );

  if (fs.existsSync(filePath)) {
    console.log(`\n❌ File already exists: ${filePath}`);
    closeReadline();
    process.exit(1);
  }

  fs.writeFileSync(filePath, frontmatter);
  console.log(`\n✅ Created: ${filePath}`);
  console.log(
    `\n📖 Run 'npm run dev' and visit: http://localhost:4321${BASE_PATH}case-studies/${slug}/`
  );

  closeReadline();
}

main().catch(console.error);
