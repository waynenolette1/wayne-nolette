import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const writing = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
      message: 'Invalid date format',
    }),
    updatedDate: z.coerce
      .date()
      .refine((date) => !isNaN(date.getTime()), {
        message: 'Invalid date format',
      })
      .optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
    project: z.string().optional(),
    confidenceLevel: z.enum(['high', 'medium']).default('medium'),
    featured: z.boolean().default(false),
    depth: z
      .enum(['overview', 'deep-dive', 'implementation'])
      .default('deep-dive'),
  }),
});

// Skills demonstrated by case studies - used for recruiter scanning
const skillsEnum = z.enum([
  'systems-design',
  'performance',
  'cost-optimization',
  'reliability',
  'ml-infrastructure',
  'data-engineering',
  'technical-leadership',
  'developer-experience',
]);

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(0),
    role: z.string().optional(),
    duration: z.string().optional(),
    outcome: z.string().optional(),
    tech: z.array(z.string()).optional(),
    // Skills demonstrated - for recruiter scanning
    skills: z.array(skillsEnum).optional(),
    // Key metrics for hero callouts
    metrics: z
      .object({
        primary: z.string().optional(), // e.g., "67x faster"
        secondary: z.string().optional(), // e.g., "99% cost reduction"
      })
      .optional(),
    // What I personally did - for ownership clarity
    ownership: z.string().optional(),
  }),
});

const adrs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/adrs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date().refine((date) => !isNaN(date.getTime()), {
      message: 'Invalid date format',
    }),
    status: z
      .enum(['accepted', 'proposed', 'deprecated', 'superseded'])
      .default('accepted'),
    deciders: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { writing, 'case-studies': caseStudies, adrs };
