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

export function buildMarkdownToolbarMenu(view: EditorView, ctx: Ctx, close: () => void): HTMLDivElement {
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
