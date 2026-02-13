import { chromium } from 'playwright';

const BASE = 'http://localhost:4321/wayne-nolette';
const WIDTH = 1200;

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Check all pages for common visual issues
  const pages = [
    { name: 'Homepage', url: `${BASE}/` },
    { name: 'Case Studies', url: `${BASE}/case-studies/` },
    { name: 'Writing', url: `${BASE}/writing/` },
    { name: 'Resume', url: `${BASE}/resume/` },
    { name: 'ADRs', url: `${BASE}/adrs/` },
  ];

  for (const p of pages) {
    await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(300);

    const issues = await page.evaluate(() => {
      const issues = [];

      // 1. Check for text truncation / overflow
      document.querySelectorAll('h1, h2, h3, p, span, a, li').forEach((el) => {
        if (el.scrollWidth > el.clientWidth + 2) {
          const text = el.textContent.trim().substring(0, 60);
          issues.push(
            `TEXT_OVERFLOW: <${el.tagName.toLowerCase()}> "${text}" overflows (scroll=${el.scrollWidth} > client=${el.clientWidth})`
          );
        }
      });

      // 2. Check for overlapping elements in cards/grids
      const cards = document.querySelectorAll(
        '[class*="card"], [class*="grid"] > *, [class*="project"]'
      );
      const cardRects = [];
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          cardRects.push({
            rect,
            el:
              card.tagName +
              (card.className ? `.${card.className.split(' ')[0]}` : ''),
          });
        }
      });

      // 3. Check content alignment - all H1s should be at same left position
      const h1s = document.querySelectorAll('h1');
      const h1Lefts = Array.from(h1s)
        .map((h) => Math.round(h.getBoundingClientRect().left))
        .filter((l) => l > 0);

      // 4. Check for zero-height sections that might be layout bugs
      document
        .querySelectorAll('section, main, .content-wrapper')
        .forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.height === 0 && el.children.length > 0) {
            issues.push(
              `ZERO_HEIGHT: <${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ')[0] : ''}> has 0 height with ${el.children.length} children`
            );
          }
        });

      // 5. Check footer is present and properly positioned
      const footer = document.querySelector('footer');
      if (footer) {
        const rect = footer.getBoundingClientRect();
        const bodyHeight = document.documentElement.scrollHeight;
        if (Math.abs(rect.bottom - bodyHeight) > 5) {
          issues.push(
            `FOOTER_GAP: Footer bottom (${Math.round(rect.bottom)}) != body height (${bodyHeight})`
          );
        }
      } else {
        issues.push('NO_FOOTER: No <footer> element found');
      }

      // 6. Check spacing consistency between main sections
      const h2s = Array.from(
        document.querySelectorAll('main h2, main h1')
      ).filter((h) => {
        const r = h.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });

      // 7. Check for very small text (below 12px)
      document.querySelectorAll('p, span, a, li, td, th').forEach((el) => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        if (fontSize > 0 && fontSize < 12 && el.textContent.trim().length > 0) {
          const text = el.textContent.trim().substring(0, 40);
          issues.push(`SMALL_TEXT: "${text}" fontSize=${fontSize}px`);
        }
      });

      // 8. Check link contrast (links should be distinguishable)
      const navLinks = document.querySelectorAll('nav a');
      navLinks.forEach((link) => {
        const style = window.getComputedStyle(link);
        const parentStyle = window.getComputedStyle(link.parentElement);
        if (style.color === parentStyle.color && !link.classList.length) {
          issues.push(
            `LOW_CONTRAST_LINK: "${link.textContent.trim()}" same color as parent`
          );
        }
      });

      return issues;
    });

    console.log(`\n${p.name}:`);
    if (issues.length === 0) {
      console.log('  No automated issues detected');
    } else {
      issues.forEach((i) => console.log(`  ${i}`));
    }
  }

  // Special check: Homepage hero section vertical rhythm
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  console.log('\n--- Homepage Hero Layout Check ---');
  const heroData = await page.evaluate(() => {
    const results = {};
    // Get the hero section elements
    const hero =
      document.querySelector('.hero') ||
      document.querySelector('section:first-of-type');
    if (hero) {
      const heroRect = hero.getBoundingClientRect();
      results.heroTop = Math.round(heroRect.top);
      results.heroHeight = Math.round(heroRect.height);
      results.heroLeft = Math.round(heroRect.left);
      results.heroWidth = Math.round(heroRect.width);
    }

    // Get CTA buttons
    const buttons = document.querySelectorAll(
      'a[class*="btn"], a[class*="cta"], a[class*="button"], .hero a'
    );
    results.buttons = Array.from(buttons).map((b) => ({
      text: b.textContent.trim().substring(0, 40),
      left: Math.round(b.getBoundingClientRect().left),
      top: Math.round(b.getBoundingClientRect().top),
    }));

    // Get stats/numbers section
    const stats = document.querySelectorAll(
      '.stat, [class*="stat"], [class*="number"]'
    );
    results.stats = Array.from(stats).map((s) => ({
      text: s.textContent.trim().substring(0, 60),
      left: Math.round(s.getBoundingClientRect().left),
      top: Math.round(s.getBoundingClientRect().top),
      width: Math.round(s.getBoundingClientRect().width),
    }));

    return results;
  });
  console.log(JSON.stringify(heroData, null, 2));

  // Check writing page filter/tag alignment
  await page.goto(`${BASE}/writing/`, { waitUntil: 'networkidle' });
  console.log('\n--- Writing Page Filters Check ---');
  const writingData = await page.evaluate(() => {
    const filters = document.querySelectorAll(
      '[class*="filter"], [class*="tag"], button[class*="tag"]'
    );
    return Array.from(filters)
      .slice(0, 10)
      .map((f) => ({
        text: f.textContent.trim().substring(0, 30),
        tag: f.tagName,
        left: Math.round(f.getBoundingClientRect().left),
        top: Math.round(f.getBoundingClientRect().top),
        visible: f.getBoundingClientRect().width > 0,
      }));
  });
  console.log(JSON.stringify(writingData, null, 2));

  await browser.close();
})();
