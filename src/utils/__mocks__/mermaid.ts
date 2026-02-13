/**
 * Mock for mermaid library used in tests.
 * Mermaid is loaded at runtime from CDN, so we mock it for testing.
 */

export default {
  initialize: () => {},
  run: () => Promise.resolve(),
};
