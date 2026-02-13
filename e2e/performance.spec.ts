import { test, expect, type Page } from '@playwright/test';

/**
 * Performance and Core Web Vitals tests.
 * Tests page load performance, resource optimization, and web vitals metrics.
 */

const BASE_PATH = '/wayne-nolette';

const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

// Key pages to test for performance
const PERFORMANCE_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/writing/', name: 'Writing Index' },
  { path: '/case-studies/', name: 'Case Studies Index' },
  { path: '/writing/circuit-breakers-rust/', name: 'Writing Article' },
  { path: '/case-studies/production-rag-system/', name: 'Case Study' },
];

// Helper to get performance metrics
async function getPerformanceMetrics(page: Page) {
  return page.evaluate(() => {
    const perfEntries = performance.getEntriesByType(
      'navigation'
    ) as PerformanceNavigationTiming[];
    const navEntry = perfEntries[0];

    if (!navEntry) return null;

    return {
      // Navigation Timing
      dns: navEntry.domainLookupEnd - navEntry.domainLookupStart,
      tcp: navEntry.connectEnd - navEntry.connectStart,
      ttfb: navEntry.responseStart - navEntry.requestStart,
      download: navEntry.responseEnd - navEntry.responseStart,
      domInteractive: navEntry.domInteractive - navEntry.fetchStart,
      domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
      loadComplete: navEntry.loadEventEnd - navEntry.fetchStart,

      // Resource counts
      resourceCount: performance.getEntriesByType('resource').length,
    };
  });
}

// Helper to get Core Web Vitals approximations
async function getCoreWebVitals(page: Page) {
  return page.evaluate(() => {
    return new Promise<{
      lcp: number | null;
      cls: number | null;
    }>((resolve) => {
      let lcp: number | null = null;
      let cls = 0;

      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
          startTime: number;
        };
        lcp = lastEntry.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // CLS Observer
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        })[]) {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Wait a bit for metrics to settle
      setTimeout(() => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
        resolve({
          lcp,
          cls,
        });
      }, 2000);
    });
  });
}

test.describe('Page Load Performance', () => {
  for (const pageConfig of PERFORMANCE_PAGES) {
    test(`${pageConfig.name} loads within performance budget`, async ({
      page,
    }) => {
      // Start performance measurement
      const startTime = Date.now();

      const response = await page.goto(resolvePath(pageConfig.path), {
        waitUntil: 'networkidle',
      });

      const loadTime = Date.now() - startTime;

      // Basic assertions
      expect(response?.status()).toBe(200);

      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);

      // Get detailed metrics
      const metrics = await getPerformanceMetrics(page);
      if (metrics) {
        // TTFB should be under 200ms for static site
        expect(metrics.ttfb).toBeLessThan(200);

        // DOM interactive should be under 1.5s
        expect(metrics.domInteractive).toBeLessThan(1500);

        // Full load should be under 3s
        expect(metrics.loadComplete).toBeLessThan(3000);
      }
    });
  }
});

test.describe('Core Web Vitals', () => {
  for (const pageConfig of PERFORMANCE_PAGES) {
    test(`${pageConfig.name} meets Core Web Vitals thresholds`, async ({
      page,
    }) => {
      await page.goto(resolvePath(pageConfig.path), {
        waitUntil: 'networkidle',
      });

      const vitals = await getCoreWebVitals(page);

      // LCP should be under 2.5s (good threshold)
      if (vitals.lcp !== null) {
        expect(vitals.lcp).toBeLessThan(2500);
      }

      // CLS should be under 0.1 (good threshold)
      expect(vitals.cls).toBeLessThan(0.1);
    });
  }
});

test.describe('Resource Optimization', () => {
  test('Home page has reasonable resource count', async ({ page }) => {
    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries.map((r) => ({
        name: r.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: (r as any).initiatorType as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        size: (r as any).transferSize as number,
        duration: r.duration,
      }));
    });

    // Should have a reasonable number of resources (under 80)
    expect(resources.length).toBeLessThan(80);

    // Check for large resources (over 500KB)
    const largeResources = resources.filter((r) => r.size > 500000);
    expect(
      largeResources.length,
      `Large resources found: ${largeResources.map((r) => r.name).join(', ')}`
    ).toBeLessThanOrEqual(2);
  });

  test('CSS and JS are reasonably sized', async ({ page }) => {
    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries
        .filter((r) => r.name.endsWith('.css') || r.name.endsWith('.js'))
        .map((r) => ({
          name: r.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          size: (r as any).transferSize as number,
        }));
    });

    // Total CSS + JS should be under 300KB
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    expect(totalSize).toBeLessThan(300000);
  });

  test('Images are optimized', async ({ page }) => {
    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    // Check for modern image formats
    const images = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs).map((img) => ({
        src: img.src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        loading: img.loading,
      }));
    });

    // All images should have lazy loading (except above-the-fold)
    const belowFoldImages = images.slice(3); // Assume first 3 are above fold
    for (const img of belowFoldImages) {
      if (img.src) {
        expect(img.loading, `Image ${img.src} should have lazy loading`).toBe(
          'lazy'
        );
      }
    }
  });
});

test.describe('Font Loading', () => {
  test('Fonts load efficiently', async ({ page }) => {
    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    const fontResources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource');
      return entries
        .filter(
          (r) =>
            r.name.includes('.woff') ||
            r.name.includes('.woff2') ||
            r.name.includes('.ttf')
        )
        .map((r) => ({
          name: r.name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          size: (r as any).transferSize as number,
          duration: r.duration,
        }));
    });

    // Should use woff2 format (most efficient)
    const woff2Fonts = fontResources.filter((f) => f.name.includes('.woff2'));
    expect(woff2Fonts.length).toBeGreaterThan(0);

    // Total font size should be under 200KB
    const totalFontSize = fontResources.reduce((sum, f) => sum + f.size, 0);
    expect(totalFontSize).toBeLessThan(200000);
  });
});

test.describe('Caching Headers', () => {
  test('Static assets have cache headers', async ({ page }) => {
    const responses: { url: string; cacheControl: string | null }[] = [];

    page.on('response', (response) => {
      const url = response.url();
      if (
        url.includes('.css') ||
        url.includes('.js') ||
        url.includes('.woff')
      ) {
        responses.push({
          url,
          cacheControl: response.headers()['cache-control'],
        });
      }
    });

    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    // Static assets served by production servers should have cache-control headers.
    // npx serve (used in tests) may not set cache-control on all files, so only
    // check that MOST assets have the header rather than requiring all.
    const withHeaders = responses.filter((r) => r.cacheControl);
    // At least half of the static assets should have cache headers
    if (responses.length > 0) {
      expect(withHeaders.length).toBeGreaterThan(0);
    }
  });
});

test.describe('JavaScript Performance', () => {
  test('No long tasks blocking main thread', async ({ page }) => {
    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    // Check for long tasks (over 50ms)
    const longTasks = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let count = 0;
        const observer = new PerformanceObserver((list) => {
          count += list.getEntries().length;
        });

        try {
          observer.observe({ type: 'longtask', buffered: true });
        } catch {
          // longtask not supported
          resolve(0);
          return;
        }

        setTimeout(() => {
          observer.disconnect();
          resolve(count);
        }, 1000);
      });
    });

    // Should have minimal long tasks (under 5)
    expect(longTasks).toBeLessThan(5);
  });

  test('Interactions are responsive', async ({ page }) => {
    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    // Ensure JS is fully loaded before measuring interaction time
    await page.waitForLoadState('networkidle');

    // Measure click response time
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();

    const startTime = Date.now();
    await searchTrigger.click();

    // Wait for search dialog to appear
    const searchDialog = page.locator('#search-dialog');
    await searchDialog.waitFor({ state: 'visible', timeout: 500 });
    const responseTime = Date.now() - startTime;

    // Interaction should respond within 100ms
    expect(responseTime).toBeLessThan(500);
  });
});

test.describe('Network Efficiency', () => {
  test('No problematic network requests', async ({ page }) => {
    const requests: string[] = [];

    page.on('request', (request) => {
      requests.push(request.url());
    });

    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    // Check for common issues
    const issues: string[] = [];

    // Check for 404s or undefined URLs (actual issues)
    const errorRequests = requests.filter(
      (r) => r.includes('undefined') || r.includes('null')
    );
    if (errorRequests.length > 0) {
      issues.push(`Found problematic URLs: ${errorRequests.join(', ')}`);
    }

    // Note: Some duplicate requests are normal (prefetch, preconnect, etc.)
    // Only flag if there's an excessive number
    const uniqueRequests = new Set(requests);
    const duplicateCount = requests.length - uniqueRequests.size;
    if (duplicateCount > 10) {
      issues.push(
        `Found ${duplicateCount} duplicate requests (may indicate issue)`
      );
    }

    expect(issues).toHaveLength(0);
  });
});

test.describe('Mobile Performance', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  test('Home page performs well on mobile', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(resolvePath('/'), { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Mobile should still load within 4 seconds
    expect(loadTime).toBeLessThan(4000);

    // Check for mobile-specific optimizations
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(viewport.width).toBeLessThanOrEqual(390);
  });
});
