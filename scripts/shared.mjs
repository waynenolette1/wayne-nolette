import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

export function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

export function closeReadline() {
  rl.close();
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Escape a string for safe use in YAML double-quoted strings.
 * Handles: backslashes, double quotes, newlines, tabs, and other control characters.
 */
export function escapeYaml(str) {
  if (str === null || str === undefined) {
    return '';
  }
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes first
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}
