import { getHeadlessMilkdownParser, parseMarkdownWithHtmlFallback } from '../../server/milkdown-headless.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  const parser = await getHeadlessMilkdownParser();

  const tableMarkdown = [
    '# Table Test',
    '',
    '| a | b |',
    '| - | - |',
    '| 1 | 2 |',
    '',
  ].join('\n');

  const tableDoc = parser.parseMarkdown(tableMarkdown);
  const tableJson = JSON.stringify(tableDoc.toJSON());
  assert(
    tableJson.includes('"table"'),
    'Expected headless parser to parse GFM tables into a table node (ensure remark-gfm is enabled).',
  );

  const htmlTableMarkdown = [
    '<table><tbody>',
    '<tr data-is-header="true"><th><p>Version</p></th><th><p>Date</p></th></tr>',
    '<tr><td><p>V0.77</p></td><td><p>2026-04-08</p></td></tr>',
    '</tbody></table>',
  ].join('\n');

  const htmlTableDoc = parseMarkdownWithHtmlFallback(parser, htmlTableMarkdown);
  const htmlTableJson = JSON.stringify(htmlTableDoc.doc?.toJSON());
  assert(htmlTableDoc.mode === 'html_tables', 'Expected raw HTML tables to use the shared table normalization path.');
  assert(htmlTableJson.includes('"table"'), 'Expected raw HTML tables to parse into a table node.');
  assert(htmlTableJson.includes('V0.77'), 'Expected raw HTML table cell content to be preserved.');

  // Ensure code blocks with proof metadata do not crash in Node (no global atob/btoa).
  // Base64 for "[]"
  const proofMeta = 'proof:W10=';
  const codeMarkdown = [
    '# Code Block Meta Test',
    '',
    '```js ' + proofMeta,
    'console.log(\"ok\")',
    '```',
    '',
  ].join('\n');

  const codeDoc = parser.parseMarkdown(codeMarkdown);
  assert(
    typeof codeDoc.textContent === 'string' && codeDoc.textContent.includes('console.log'),
    'Expected headless parser to parse fenced code blocks with proof meta.',
  );

  console.log('✓ headless Milkdown parser supports GFM tables + Node-safe proof meta decoding');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
