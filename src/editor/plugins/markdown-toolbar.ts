import { commandsCtx } from '@milkdown/kit/core';
import type { EditorView } from '@milkdown/kit/prose/view';
import type { Ctx } from '@milkdown/ctx';
import {
  toggleStrongCommand,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleLinkCommand,
  wrapInHeadingCommand,
  downgradeHeadingCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
} from '@milkdown/preset-commonmark';
import { toggleStrikethroughCommand } from '@milkdown/preset-gfm';

interface ActiveState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
  heading: number;
  block: string;
}

interface ToolbarHooks {
  beforeOpen?: () => void;
  registerCloser?: (close: () => void) => void;
}

interface ToolbarItem {
  label: string;
  active: boolean;
  run: () => void;
}

interface ToolbarSection {
  title: string;
  items: ToolbarItem[];
}

function computeActiveState(view: EditorView): ActiveState {
  const { state } = view;
  const { from, to, $from, empty } = state.selection;
  const schema = state.schema;
  const isMark = (name: string): boolean => {
    const type = schema.marks[name];
    if (!type) return false;
    if (empty) {
      const marks = state.storedMarks ?? $from.marks();
      return !!type.isInSet(marks);
    }
    return state.doc.rangeHasMark(from, to, type);
  };
  const block = $from.parent.type.name;
  const heading = block === 'heading' ? Number($from.parent.attrs.level ?? 0) : 0;
  return {
    bold: isMark('strong'),
    italic: isMark('emphasis'),
    strike: isMark('strike_through'),
    code: isMark('inlineCode'),
    link: isMark('link'),
    heading,
    block,
  };
}

function buildSections(ctx: Ctx, active: ActiveState): ToolbarSection[] {
  const run = <T,>(command: { key: any }, payload?: T) => {
    ctx.get(commandsCtx).call(command.key, payload);
  };

  return [
    {
      title: 'Text style',
      items: [
        {
          label: 'Heading 1',
          active: active.heading === 1,
          run: () => run(wrapInHeadingCommand, 1),
        },
        {
          label: 'Heading 2',
          active: active.heading === 2,
          run: () => run(wrapInHeadingCommand, 2),
        },
        {
          label: 'Heading 3',
          active: active.heading === 3,
          run: () => run(wrapInHeadingCommand, 3),
        },
        {
          label: 'Normal text',
          active: active.heading === 0 && active.block === 'paragraph',
          run: () => run(downgradeHeadingCommand),
        },
      ],
    },
    {
      title: 'Inline',
      items: [
        { label: 'Bold', active: active.bold, run: () => run(toggleStrongCommand) },
        { label: 'Italic', active: active.italic, run: () => run(toggleEmphasisCommand) },
        { label: 'Strikethrough', active: active.strike, run: () => run(toggleStrikethroughCommand) },
        { label: 'Inline code', active: active.code, run: () => run(toggleInlineCodeCommand) },
        {
          label: 'Link',
          active: active.link,
          run: () => {
            if (active.link) {
              run(toggleLinkCommand, { href: '' });
              return;
            }
            const href = window.prompt('Link URL');
            if (href === null || href.trim() === '') return;
            run(toggleLinkCommand, { href: href.trim() });
          },
        },
      ],
    },
    {
      title: 'Blocks',
      items: [
        {
          label: 'Blockquote',
          active: active.block === 'blockquote',
          run: () => run(wrapInBlockquoteCommand),
        },
        {
          label: 'Bullet list',
          active: active.block === 'bullet_list',
          run: () => run(wrapInBulletListCommand),
        },
        {
          label: 'Ordered list',
          active: active.block === 'ordered_list',
          run: () => run(wrapInOrderedListCommand),
        },
      ],
    },
  ];
}

function buildMenu(ctx: Ctx, view: EditorView, close: () => void): HTMLDivElement {
  const menu = document.createElement('div');
  menu.className = 'markdown-toolbar-menu';
  menu.setAttribute('role', 'menu');

  const sections = buildSections(ctx, computeActiveState(view));
  sections.forEach((section, index) => {
    if (index > 0) {
      const divider = document.createElement('div');
      divider.className = 'markdown-toolbar-divider';
      menu.appendChild(divider);
    }
    const heading = document.createElement('div');
    heading.className = 'markdown-toolbar-section';
    heading.textContent = section.title;
    menu.appendChild(heading);

    for (const item of section.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.className = 'markdown-toolbar-item';
      if (item.active) {
        button.classList.add('markdown-toolbar-item--active');
        button.setAttribute('aria-checked', 'true');
      }
      const label = document.createElement('span');
      label.textContent = item.label;
      button.appendChild(label);
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
      });
      button.addEventListener('click', () => {
        item.run();
        close();
        view.focus();
      });
      menu.appendChild(button);
    }
  });

  return menu;
}

export function createMarkdownToolbarButton(
  view: EditorView,
  ctx: Ctx,
  hooks: ToolbarHooks = {},
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'markdown-toolbar-btn';
  container.style.cssText = 'position:relative;display:inline-flex;align-items:center';

  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Markdown formatting toolbar');
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;min-width:44px;padding:0 16px;background:#111;
    border:none;border-radius:22px;color:#fff;font-size:13px;font-weight:600;
    cursor:pointer;transition:background 0.15s;flex-shrink:0;font-family:inherit;
  `;

  const label = document.createElement('span');
  label.className = 'markdown-toolbar-label';
  label.textContent = 'Toolbar';
  const caret = document.createElement('span');
  caret.textContent = '▾';
  caret.style.cssText = 'font-size:10px;opacity:0.7';
  button.append(label, caret);

  button.onmouseenter = () => {
    button.style.background = '#333';
  };
  button.onmouseleave = () => {
    button.style.background = '#111';
  };

  let cleanup: (() => void) | null = null;

  const close = (): void => {
    if (!cleanup) return;
    const fn = cleanup;
    cleanup = null;
    fn();
  };

  const open = (): void => {
    if (cleanup) {
      close();
      return;
    }
    hooks.beforeOpen?.();

    const menu = buildMenu(ctx, view, () => close());
    container.appendChild(menu);
    button.setAttribute('aria-expanded', 'true');

    const onDocMouseDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (container.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);

    cleanup = () => {
      document.removeEventListener('mousedown', onDocMouseDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      if (menu.isConnected) menu.remove();
      button.setAttribute('aria-expanded', 'false');
    };
  };

  button.onclick = () => {
    open();
  };

  hooks.registerCloser?.(() => close());

  container.appendChild(button);
  return container;
}
