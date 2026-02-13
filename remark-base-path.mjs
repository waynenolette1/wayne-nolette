/**
 * Remark plugin to automatically prefix internal markdown links with the base path.
 * This ensures links like [text](/case-studies/...) become [text](/wayne-nolette/case-studies/...)
 * when deployed to GitHub Pages.
 */
import { visit } from 'unist-util-visit';
import { BASE_PATH } from './site.config.mjs';

// Strip trailing slash for URL concatenation
const prefix = BASE_PATH.replace(/\/$/, '');

export default function remarkBasePath() {
  return (tree) => {
    visit(tree, ['link', 'image'], (node) => {
      if (
        node.url &&
        node.url.startsWith('/') &&
        !node.url.startsWith(prefix) &&
        !node.url.startsWith('//')
      ) {
        node.url = prefix + node.url;
      }
    });
  };
}
