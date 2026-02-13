/**
 * Lightweight Core Web Vitals tracking scripts.
 * Data is stored in sessionStorage for debugging - no external calls.
 */

export const WEB_VITALS_SCRIPT = `
(function() {
  if (!('PerformanceObserver' in window)) return;

  var metrics = {};
  var observers = [];
  var clsValue = 0;
  var maxINP = 0;

  function createObserver(type, callback) {
    try {
      var observer = new PerformanceObserver(callback);
      observer.observe({ type: type, buffered: true });
      observers.push(observer);
    } catch (e) {}
  }

  function saveMetrics() {
    try { sessionStorage.setItem('cwv', JSON.stringify(metrics)); } catch(e) {}
  }

  function initWebVitals() {
    if (window.__webVitalsInitialized) return;
    window.__webVitalsInitialized = true;

    metrics = {};
    clsValue = 0;
    maxINP = 0;

    // LCP - Largest Contentful Paint
    createObserver('largest-contentful-paint', function(entryList) {
      var entries = entryList.getEntries();
      if (entries.length === 0) return;
      metrics.lcp = entries[entries.length - 1].startTime;
      saveMetrics();
    });

    // CLS - Cumulative Layout Shift
    createObserver('layout-shift', function(entryList) {
      var entries = entryList.getEntries();
      for (var i = 0; i < entries.length; i++) {
        if (!entries[i].hadRecentInput && Number.isFinite(entries[i].value)) {
          clsValue += entries[i].value;
        }
      }
      metrics.cls = clsValue;
      saveMetrics();
    });

    // FCP - First Contentful Paint
    createObserver('paint', function(entryList) {
      var entries = entryList.getEntries();
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].name === 'first-contentful-paint') {
          metrics.fcp = entries[i].startTime;
          saveMetrics();
          break;
        }
      }
    });

    // INP - Interaction to Next Paint
    createObserver('event', function(entryList) {
      var entries = entryList.getEntries();
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].interactionId && entries[i].duration > maxINP) {
          maxINP = entries[i].duration;
          metrics.inp = maxINP;
          saveMetrics();
        }
      }
    });
  }

  function cleanupWebVitals() {
    for (var i = 0; i < observers.length; i++) {
      try { observers[i].disconnect(); } catch(e) {}
    }
    observers = [];
    window.__webVitalsInitialized = false;
  }

  initWebVitals();

  if (!window.__webVitalsRegistered) {
    window.__webVitalsRegistered = true;
    document.addEventListener('astro:after-swap', initWebVitals);
    document.addEventListener('astro:before-swap', cleanupWebVitals);
  }
})();
`;

/**
 * Console reporter for development debugging.
 * Logs performance metrics to console after page load.
 */
export const DEV_PERFORMANCE_REPORTER = `
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      const metrics = JSON.parse(sessionStorage.getItem('cwv') || '{}');
      if (Object.keys(metrics).length > 0) {
        console.group('Core Web Vitals');
        if (metrics.lcp) console.log('LCP:', metrics.lcp.toFixed(0) + 'ms', metrics.lcp < 2500 ? '(good)' : metrics.lcp < 4000 ? '(needs improvement)' : '(poor)');
        if (metrics.inp) console.log('INP:', metrics.inp.toFixed(0) + 'ms', metrics.inp < 200 ? '(good)' : metrics.inp < 500 ? '(needs improvement)' : '(poor)');
        if (metrics.cls !== undefined) console.log('CLS:', metrics.cls.toFixed(3), metrics.cls < 0.1 ? '(good)' : metrics.cls < 0.25 ? '(needs improvement)' : '(poor)');
        if (metrics.fcp) console.log('FCP:', metrics.fcp.toFixed(0) + 'ms', metrics.fcp < 1800 ? '(good)' : metrics.fcp < 3000 ? '(needs improvement)' : '(poor)');
        console.groupEnd();
      }
    } catch(e) {}
  }, 3000);
});
`;
