/**
 * Share-pill bubbles: the elements that sit in the share banner row —
 * collaborator initial circles and the action pills (agent trigger, share trigger).
 *
 * Avatars are 32px circles. Action pills are 32px tall with an icon + label.
 * Both share height, font, and centering so the row reads as one family;
 * only the per-user color and the icon shape vary.
 */

export const SHARE_BUBBLE_SIZE = 32;
export const SHARE_BUBBLE_ICON_SIZE = 16;
export const SHARE_AVATAR_SIZE = 27;

const SHARED_STYLE = `
  display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;
  font-family:inherit;line-height:1;
`;

const CIRCLE_STYLE = `${SHARED_STYLE}
  width:${SHARE_AVATAR_SIZE}px;height:${SHARE_AVATAR_SIZE}px;border-radius:50%;
`;

const PILL_STYLE = `${SHARED_STYLE}
  height:${SHARE_BUBBLE_SIZE}px;padding:0 12px;gap:6px;border-radius:999px;
`;

const BUTTON_BG = 'transparent';
const BUTTON_BG_HOVER = 'rgba(0,0,0,0.06)';
const BUTTON_FG = '#000';

export function createShareBubbleButton(opts: {
  ariaLabel: string;
  icon: SVGElement;
  label: string;
  iconSize?: number;
  className?: string;
}): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', opts.ariaLabel);
  if (opts.className) btn.className = opts.className;
  btn.style.cssText = `${PILL_STYLE}
    cursor:pointer;border:0;
    background:${BUTTON_BG};color:${BUTTON_FG};
    font-size:13px;font-weight:600;
    transition:background 0.15s;`;

  const iconSize = opts.iconSize ?? SHARE_BUBBLE_ICON_SIZE;
  opts.icon.setAttribute('width', String(iconSize));
  opts.icon.setAttribute('height', String(iconSize));
  opts.icon.setAttribute('aria-hidden', 'true');
  btn.appendChild(opts.icon);

  const label = document.createElement('span');
  label.textContent = opts.label;
  btn.appendChild(label);

  btn.addEventListener('mouseenter', () => {
    btn.style.background = BUTTON_BG_HOVER;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = BUTTON_BG;
  });
  return btn;
}

export function createShareBubbleInitial(opts: {
  initial: string;
  bg: string;
  fg?: string;
  /** 2px white ring + subtle shadow for stacked avatars. */
  withRing?: boolean;
  fontSize?: number;
}): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = opts.initial;
  span.style.cssText = `${CIRCLE_STYLE}
    background:${opts.bg};color:${opts.fg ?? '#fff'};
    font-size:${opts.fontSize ?? 13}px;font-weight:600;
    ${opts.withRing ? 'border:2px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.08);' : ''}`;
  return span;
}
