const HTML_TABLE_PATTERN = /<table\b[\s\S]*?<\/table>/gi;
const HTML_ROW_PATTERN = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
const HTML_CELL_PATTERN = /<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const FENCED_CODE_PATTERN = /(^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:\n\2[ \t]*(?=\n|$)|$)/g;

type HtmlTableCell = {
  text: string;
  header: boolean;
  align: 'left' | 'center' | 'right' | null;
};

type ProtectedFence = {
  token: string;
  value: string;
};

const namedEntities: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, raw: string) => {
    const lower = raw.toLowerCase();
    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return namedEntities[lower] ?? entity;
  });
}

function protectFencedCode(markdown: string): { text: string; fences: ProtectedFence[] } {
  const fences: ProtectedFence[] = [];
  const text = markdown.replace(FENCED_CODE_PATTERN, (value) => {
    const token = `\u0000PROOF_FENCE_${fences.length}\u0000`;
    fences.push({ token, value });
    return token;
  });
  return { text, fences };
}

function restoreFencedCode(markdown: string, fences: ProtectedFence[]): string {
  let restored = markdown;
  for (const fence of fences) {
    restored = restored.replace(fence.token, fence.value);
  }
  return restored;
}

function inlineCode(value: string): string {
  const decoded = decodeHtmlEntities(value.replace(/<[^>]*>/g, '')).trim();
  if (!decoded) return '';
  let fence = '`';
  while (decoded.includes(fence)) fence += '`';
  return `${fence}${decoded}${fence}`;
}

function normalizeCellText(html: string): string {
  const withInlineCode = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_match, code: string) => inlineCode(code))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p\b[^>]*>/gi, '\n')
    .replace(/<\/?(?:p|div|section|article|ul|ol|li)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '');

  return decodeHtmlEntities(withInlineCode)
    .split(/\n+/)
    .map((line) => line.replace(/[ \t\r\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('<br>')
    .replace(/\|/g, '\\|')
    .trim();
}

function extractAlign(attrs: string): HtmlTableCell['align'] {
  const attrAlign = attrs.match(/\balign\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const align = (attrAlign?.[1] ?? attrAlign?.[2] ?? attrAlign?.[3] ?? '').toLowerCase();
  if (align === 'left' || align === 'center' || align === 'right') return align;

  const styleAlign = attrs.match(/text-align\s*:\s*(left|center|right)/i)?.[1]?.toLowerCase();
  if (styleAlign === 'left' || styleAlign === 'center' || styleAlign === 'right') return styleAlign;
  return null;
}

function parseHtmlTableRows(tableHtml: string): HtmlTableCell[][] {
  const rows: HtmlTableCell[][] = [];
  for (const rowMatch of tableHtml.matchAll(HTML_ROW_PATTERN)) {
    const rowHtml = rowMatch[0];
    const rowIsHeader = /\bdata-is-header\s*=\s*(?:"true"|'true'|true)/i.test(rowHtml);
    const cells: HtmlTableCell[] = [];
    for (const cellMatch of rowHtml.matchAll(HTML_CELL_PATTERN)) {
      const tag = cellMatch[1].toLowerCase();
      const attrs = cellMatch[2] ?? '';
      const text = normalizeCellText(cellMatch[3] ?? '');
      cells.push({
        text,
        header: rowIsHeader || tag === 'th',
        align: extractAlign(attrs),
      });
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function separatorForAlign(align: HtmlTableCell['align']): string {
  if (align === 'center') return ':---:';
  if (align === 'right') return '---:';
  if (align === 'left') return ':---';
  return '---';
}

function htmlTableToMarkdown(tableHtml: string): string {
  const rows = parseHtmlTableRows(tableHtml);
  if (rows.length === 0) return tableHtml;

  const columnCount = Math.max(...rows.map((row) => row.length));
  if (columnCount === 0) return tableHtml;

  const firstHeaderIndex = rows.findIndex((row) => row.some((cell) => cell.header));
  const headerIndex = firstHeaderIndex >= 0 ? firstHeaderIndex : 0;
  const header = rows[headerIndex];
  const bodyRows = rows.filter((_row, index) => index !== headerIndex);

  const renderRow = (row: HtmlTableCell[]): string => {
    const cells = Array.from({ length: columnCount }, (_unused, index) => row[index]?.text ?? '');
    return `| ${cells.join(' | ')} |`;
  };

  const aligns = Array.from({ length: columnCount }, (_unused, index) => header[index]?.align ?? null);
  return [
    renderRow(header),
    `| ${aligns.map(separatorForAlign).join(' | ')} |`,
    ...bodyRows.map(renderRow),
  ].join('\n');
}

export function normalizeHtmlTablesToMarkdown(markdown: string): string {
  if (!markdown || !/<table\b/i.test(markdown)) return markdown;
  const protectedInput = protectFencedCode(markdown);
  const normalized = protectedInput.text.replace(HTML_TABLE_PATTERN, (tableHtml) => {
    const tableMarkdown = htmlTableToMarkdown(tableHtml);
    if (tableMarkdown === tableHtml) return tableHtml;
    return `\n\n${tableMarkdown}\n\n`;
  });
  return restoreFencedCode(normalized.replace(/\n{3,}/g, '\n\n').trimEnd(), protectedInput.fences);
}
