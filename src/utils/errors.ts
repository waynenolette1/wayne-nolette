/**
 * Global error handler script for client-side error tracking.
 * Logs errors to console with structured format for easier debugging.
 */
export const GLOBAL_ERROR_HANDLER = `
(function() {
  var handling = false;

  window.onerror = function(message, source, lineno, colno, error) {
    if (handling) return false;
    handling = true;
    try {
      console.error('[Client Error]', {
        message: message,
        source: source,
        line: lineno,
        column: colno,
        stack: error?.stack
      });
    } catch(e) {}
    handling = false;
    return false;
  };

  window.onunhandledrejection = function(event) {
    if (handling) return;
    handling = true;
    try {
      console.error('[Unhandled Promise Rejection]', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    } catch(e) {}
    handling = false;
  };
})();
`;
