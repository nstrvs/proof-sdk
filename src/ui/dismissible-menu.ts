export interface DismissibleMenuOptions {
  container: Node;
  onDismiss: () => void;
  trigger?: HTMLElement | null;
  openClassTarget?: HTMLElement | null;
  openClass?: string;
  onKeyDown?: (event: KeyboardEvent) => boolean | void;
  /** Synchronous hook fired alongside open-class removal — for callers that
   *  need to toggle additional state (e.g. a second open class on a different
   *  element) at the same instant the exit transition starts. */
  beforeDismiss?: () => void;
  /** Delay (ms) between visual close (open class removed, listeners detached)
   *  and the `onDismiss` callback firing. Lets an exit transition play before
   *  the caller tears down the DOM. Default 0 = synchronous (legacy behaviour). */
  exitDuration?: number;
}

export function attachDismissibleMenu(opts: DismissibleMenuOptions): () => void {
  const { container, onDismiss, trigger, openClassTarget, openClass, onKeyDown, beforeDismiss, exitDuration } = opts;

  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    document.removeEventListener('mousedown', onDocMouseDown, true);
    document.removeEventListener('keydown', onDocKeyDown, true);
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (openClassTarget && openClass) openClassTarget.classList.remove(openClass);
    beforeDismiss?.();
    if (exitDuration && exitDuration > 0) {
      window.setTimeout(onDismiss, exitDuration);
    } else {
      onDismiss();
    }
  };

  const onDocMouseDown = (event: MouseEvent) => {
    if (!(event.target instanceof Node)) return;
    if (container.contains(event.target)) return;
    dismiss();
  };

  const onDocKeyDown = (event: KeyboardEvent) => {
    if (onKeyDown && onKeyDown(event)) return;
    if (event.key === 'Escape') dismiss();
  };

  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  // Defer class add by one frame so an entry transition can play from the
  // closed state — the element is typically inserted into the DOM in the
  // same task as this attach call, so a synchronous add would skip the
  // transition. The 16ms delay on trigger-state classes is imperceptible.
  if (openClassTarget && openClass) {
    const target = openClassTarget;
    const cls = openClass;
    requestAnimationFrame(() => {
      if (!dismissed) target.classList.add(cls);
    });
  }
  document.addEventListener('mousedown', onDocMouseDown, true);
  document.addEventListener('keydown', onDocKeyDown, true);

  return dismiss;
}
