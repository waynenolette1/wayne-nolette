import { chromium } from 'playwright';

const pages = [
  {
    url: 'http://localhost:4321/wayne-nolette/writing/',
    output: 'test-results/audit-writing-index.png',
  },
  {
    url: 'http://localhost:4321/wayne-nolette/writing/hybrid-search-rust-clickhouse/',
    output: 'test-results/audit-article-detail.png',
  },
  {
    url: 'http://localhost:4321/wayne-nolette/case-studies/production-rag-system/',
    output: 'test-results/audit-casestudy-detail.png',
  },
  {
    url: 'http://localhost:4321/wayne-nolette/adrs/',
    output: 'test-results/audit-adrs.png',
  },
];

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 },
  });

  for (const { url, output } of pages) {
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.screenshot({ path: output, fullPage: true });
      console.log('Saved: ' + output);
    } catch (err) {
      console.error('Failed: ' + url + ' — ' + err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('Done.');
}

run();
