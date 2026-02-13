/**
 * Rehype plugin to wrap <table> elements in a scrollable container.
 * This enables horizontal scrolling for wide tables on mobile devices
 * without causing the entire page to scroll horizontally.
 */
import { visit } from 'unist-util-visit';

export default function rehypeTableWrapper() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      // Only process table elements
      if (node.tagName !== 'table') return;

      // Skip if already wrapped (parent is a div with table-scroll class)
      if (
        parent &&
        parent.tagName === 'div' &&
        parent.properties?.className?.includes('table-scroll')
      ) {
        return;
      }

      // Create wrapper div
      const wrapper = {
        type: 'element',
        tagName: 'div',
        properties: {
          className: ['table-scroll'],
        },
        children: [node],
      };

      // Replace the table with the wrapper containing the table
      if (parent && typeof index === 'number') {
        parent.children[index] = wrapper;
      }
    });
  };
}
