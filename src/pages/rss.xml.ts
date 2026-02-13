import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { sortByDateDesc } from '../utils/collections';
import { SITE_CONFIG } from '../config/constants';

/**
 * Escape XML special characters to prevent injection.
 * Even though content is trusted (from markdown files), this is defense-in-depth.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * RSS Feed Configuration
 */
const RSS_CONFIG = {
  title: SITE_CONFIG.name,
  description:
    'Technical writing on AI systems, cloud automation, engineering operations, and data-powered decisioning.',
  author: {
    name: SITE_CONFIG.name,
    email: SITE_CONFIG.email,
  },
  language: 'en-us',
  copyright: `Copyright ${new Date().getFullYear()} Wayne Nolette`,
  ttl: 60, // Time to live in minutes
  categories: [
    'Technology',
    'Engineering Management',
    'AI Systems',
    'Cloud Automation',
    'Data Infrastructure',
  ],
} as const;

/**
 * Convert markdown to simple HTML for RSS content.
 * This is a basic conversion - complex markdown won't render perfectly.
 */
function markdownToHtml(markdown: string): string {
  return (
    markdown
      // Code blocks (must be before inline code)
      .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Unordered lists
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Paragraphs (double newlines)
      .replace(/\n\n/g, '</p><p>')
      // Wrap in paragraph
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      // Clean up list items
      .replace(/<p>(<li>[\s\S]*?<\/li>)<\/p>/g, '<ul>$1</ul>')
      // Clean up empty paragraphs
      .replace(/<p>\s*<\/p>/g, '')
  );
}

/**
 * Estimate reading time for an article.
 */
function estimateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  return Math.ceil(words / wordsPerMinute);
}

export async function GET(context: APIContext) {
  if (!context.site) {
    throw new Error(
      'RSS feed requires site URL. Add "site" to astro.config.mjs'
    );
  }

  const posts = await getCollection('writing', ({ data }) => !data.draft);
  const sortedPosts = sortByDateDesc(posts);

  // context.site already includes the base path (/wayne-nolette/)
  // Strip trailing slash so we can build URLs like ${siteUrl}/rss.xml
  const siteUrl = context.site.toString().replace(/\/$/, '');

  // Build custom channel data with author info and feed categories
  // Use escapeXml for all text content (URLs are safe, but text content could theoretically contain XML chars)
  const channelCustomData = [
    `<atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>`,
    `<language>${escapeXml(RSS_CONFIG.language)}</language>`,
    `<copyright>${escapeXml(RSS_CONFIG.copyright)}</copyright>`,
    `<managingEditor>${escapeXml(RSS_CONFIG.author.email)} (${escapeXml(RSS_CONFIG.author.name)})</managingEditor>`,
    `<webMaster>${escapeXml(RSS_CONFIG.author.email)} (${escapeXml(RSS_CONFIG.author.name)})</webMaster>`,
    `<ttl>${RSS_CONFIG.ttl}</ttl>`,
    `<image>
      <url>${siteUrl}/og-image.png</url>
      <title>${escapeXml(RSS_CONFIG.title)}</title>
      <link>${siteUrl}/</link>
    </image>`,
    ...RSS_CONFIG.categories.map(
      (cat) => `<category>${escapeXml(cat)}</category>`
    ),
  ].join('\n    ');

  return rss({
    title: RSS_CONFIG.title,
    description: RSS_CONFIG.description,
    site: context.site,
    // Custom XML namespaces for extended RSS support
    xmlns: {
      content: 'http://purl.org/rss/1.0/modules/content/',
      atom: 'http://www.w3.org/2005/Atom',
      dc: 'http://purl.org/dc/elements/1.1/',
      media: 'http://search.yahoo.com/mrss/',
    },
    customData: channelCustomData,
    items: sortedPosts.map((post) => {
      // Get raw body content (after frontmatter)
      const bodyContent = post.body || '';

      // Convert to HTML for content:encoded
      const htmlContent = markdownToHtml(bodyContent);

      // Estimate reading time
      const readingTime = estimateReadingTime(bodyContent);

      // Build item custom data
      // Note: pubDate is set separately and generates RFC 822 format automatically
      // htmlContent is in CDATA so doesn't need escaping, but other fields do
      const itemCustomData = [
        `<content:encoded><![CDATA[${htmlContent}]]></content:encoded>`,
        `<dc:creator>${escapeXml(RSS_CONFIG.author.name)}</dc:creator>`,
        `<dc:format>text/html</dc:format>`,
        // Add GUID for unique identification (post.id is a slug, escape for safety)
        `<guid isPermaLink="true">${siteUrl}/writing/${escapeXml(post.id)}/</guid>`,
      ].join('\n      ');

      return {
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: `${post.data.description} (${readingTime} min read)`,
        link: `${import.meta.env.BASE_URL}writing/${post.id}/`,
        author: `${RSS_CONFIG.author.email} (${RSS_CONFIG.author.name})`,
        customData: itemCustomData,
        // Add categories/tags if available
        categories: post.data.tags || [],
      };
    }),
  });
}
