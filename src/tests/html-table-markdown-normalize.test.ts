import { normalizeHtmlTablesToMarkdown } from '../shared/html-table-markdown.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const htmlTable = [
  'Before',
  '',
  '<table><tbody>',
  '<tr data-is-header="true"><th style="text-align: left;"><p>Version</p></th><th><p>Date</p></th><th><p>Summary</p></th></tr>',
  '<tr><td><p>V0.77</p></td><td><p>2026-04-08</p></td><td><p>Package rename <code>ai-runtime</code> to <code>ai</code></p></td></tr>',
  '<tr><td><p>V0.76</p></td><td><p>2026-04-07</p></td><td><p>Pipe A | Pipe B</p></td></tr>',
  '</tbody></table>',
  '',
  'After',
].join('\n');

const normalized = normalizeHtmlTablesToMarkdown(htmlTable);

assert(normalized.includes('| Version | Date | Summary |'), 'Expected HTML header cells to become a markdown table header');
assert(normalized.includes('| :--- | --- | --- |'), 'Expected text-align:left to become a left-aligned GFM separator');
assert(
  normalized.includes('| V0.77 | 2026-04-08 | Package rename `ai-runtime` to `ai` |'),
  'Expected paragraph and code tags inside cells to normalize into markdown cell content',
);
assert(normalized.includes('| V0.76 | 2026-04-07 | Pipe A \\| Pipe B |'), 'Expected pipes inside cells to be escaped');
assert(normalized.includes('Before') && normalized.includes('After'), 'Expected surrounding markdown to be preserved');

const fenced = [
  '```html',
  '<table><tr><td>Not a table</td></tr></table>',
  '```',
].join('\n');

assert(
  normalizeHtmlTablesToMarkdown(fenced) === fenced,
  'Expected fenced HTML tables to be left untouched',
);

console.log('✓ HTML tables normalize to shared GFM markdown');
