/**
 * Agent Input Dialog
 *
 * A floating dialog for invoking the agent with a custom prompt.
 * Appears near the selection when Cmd+Shift+P is pressed.
 */

import type { AgentInputContext, AgentInputCallbacks } from '../editor/plugins/keybindings';
import { attachDismissibleMenu } from './dismissible-menu';

// ============================================================================
// Types
// ============================================================================

interface DialogState {
  callbacks: AgentInputCallbacks | null;
  element: HTMLElement | null;
  detach: (() => void) | null;
}

// ============================================================================
// State
// ============================================================================

const state: DialogState = {
  callbacks: null,
  element: null,
  detach: null,
};

// ============================================================================
// Dialog Element
// ============================================================================

function createDialogElement(): HTMLElement {
  const dialog = document.createElement('div');
  dialog.className = 'agent-input-dialog';
  dialog.innerHTML = `
    <div class="agent-input-dialog-content">
      <div class="agent-input-dialog-header">
        <span class="agent-input-dialog-title">Ask Proof</span>
        <button class="agent-input-dialog-close" aria-label="Close">&times;</button>
      </div>
      <div class="agent-input-dialog-body">
        <div class="agent-input-dialog-selection"></div>
        <textarea
          class="agent-input-dialog-textarea"
          placeholder="What would you like Proof to do?"
          rows="3"
        ></textarea>
      </div>
      <div class="agent-input-dialog-footer">
        <div class="agent-input-dialog-quick-actions">
          <button class="agent-input-quick-action" data-action="fix-grammar">Fix grammar</button>
          <button class="agent-input-quick-action" data-action="improve-clarity">Improve clarity</button>
          <button class="agent-input-quick-action" data-action="make-shorter">Make shorter</button>
        </div>
        <div class="agent-input-dialog-actions">
          <button class="agent-input-dialog-cancel">Cancel</button>
          <button class="agent-input-dialog-submit">Send</button>
        </div>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .agent-input-dialog {
      position: fixed;
      z-index: 10000;
      background: var(--proof-bg, #ffffff);
      border: 1px solid var(--proof-border, #e5e7eb);
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      width: 400px;
      max-width: calc(100vw - 32px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      opacity: 0;
      transform: translateY(-8px);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .agent-input-dialog.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .agent-input-dialog-content {
      display: flex;
      flex-direction: column;
    }

    .agent-input-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--proof-border, #e5e7eb);
    }

    .agent-input-dialog-title {
      font-weight: 600;
      color: var(--proof-text, #1f2937);
    }

    .agent-input-dialog-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--proof-text-muted, #6b7280);
      padding: 0;
      line-height: 1;
    }

    .agent-input-dialog-close:hover {
      color: var(--proof-text, #1f2937);
    }

    .agent-input-dialog-body {
      padding: 16px;
    }

    .agent-input-dialog-selection {
      background: var(--proof-bg-secondary, #f3f4f6);
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 13px;
      color: var(--proof-text-muted, #6b7280);
      max-height: 80px;
      overflow-y: auto;
      white-space: pre-wrap;
      display: none;
    }

    .agent-input-dialog-selection.has-selection {
      display: block;
    }

    .agent-input-dialog-textarea {
      width: 100%;
      border: 1px solid var(--proof-border, #e5e7eb);
      border-radius: 4px;
      padding: 10px 12px;
      font-family: inherit;
      font-size: 14px;
      resize: vertical;
      min-height: 60px;
      color: var(--proof-text, #1f2937);
      background: var(--proof-bg, #ffffff);
    }

    .agent-input-dialog-textarea:focus {
      outline: none;
      border-color: var(--proof-primary, #2563eb);
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
    }

    .agent-input-dialog-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--proof-border, #e5e7eb);
    }

    .agent-input-dialog-quick-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .agent-input-quick-action {
      background: var(--proof-bg-secondary, #f3f4f6);
      border: 1px solid var(--proof-border, #e5e7eb);
      border-radius: 4px;
      padding: 4px 10px;
      font-size: 12px;
      cursor: pointer;
      color: var(--proof-text-muted, #6b7280);
      transition: all 0.1s ease;
    }

    .agent-input-quick-action:hover {
      background: var(--proof-bg-hover, #e5e7eb);
      color: var(--proof-text, #1f2937);
    }

    .agent-input-dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .agent-input-dialog-cancel,
    .agent-input-dialog-submit {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.1s ease;
    }

    .agent-input-dialog-cancel {
      background: none;
      border: 1px solid var(--proof-border, #e5e7eb);
      color: var(--proof-text-muted, #6b7280);
    }

    .agent-input-dialog-cancel:hover {
      background: var(--proof-bg-secondary, #f3f4f6);
    }

    .agent-input-dialog-submit {
      background: var(--proof-primary, #2563eb);
      border: none;
      color: white;
    }

    .agent-input-dialog-submit:hover {
      background: var(--proof-primary-hover, #1d4ed8);
    }

    .agent-input-dialog-submit:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .agent-input-dialog {
        --proof-bg: #1f2937;
        --proof-bg-secondary: #374151;
        --proof-bg-hover: #4b5563;
        --proof-border: #4b5563;
        --proof-text: #f9fafb;
        --proof-text-muted: #9ca3af;
      }
    }
  `;

  document.head.appendChild(style);
  return dialog;
}

// ============================================================================
// Dialog Positioning
// ============================================================================

function positionDialog(dialog: HTMLElement, position: { top: number; left: number }): void {
  const margin = 16;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // Start by positioning below the selection
  let top = position.top + 24;
  let left = position.left;

  // Get dialog dimensions after a brief render
  dialog.style.visibility = 'hidden';
  dialog.style.left = '0px';
  dialog.style.top = '0px';
  document.body.appendChild(dialog);

  const rect = dialog.getBoundingClientRect();

  // Adjust horizontal position
  if (left + rect.width > viewportW - margin) {
    left = viewportW - rect.width - margin;
  }
  if (left < margin) {
    left = margin;
  }

  // Adjust vertical position - prefer below, but go above if not enough space
  if (top + rect.height > viewportH - margin) {
    // Try above
    const aboveTop = position.top - rect.height - 8;
    if (aboveTop >= margin) {
      top = aboveTop;
    } else {
      // Constrain to viewport
      top = Math.max(margin, viewportH - rect.height - margin);
    }
  }

  dialog.style.visibility = '';
  dialog.style.left = `${left}px`;
  dialog.style.top = `${top}px`;
}

// ============================================================================
// Event Handlers
// ============================================================================

function submitDialog(): void {
  if (!state.element || !state.callbacks) return;

  const textarea = state.element.querySelector('.agent-input-dialog-textarea') as HTMLTextAreaElement;
  const prompt = textarea?.value.trim();

  if (prompt) {
    state.callbacks.onSubmit(prompt);
  }

  closeDialog();
}

function closeDialog(): void {
  state.detach?.();
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Show the agent input dialog
 */
export function showAgentInputDialog(
  context: AgentInputContext,
  callbacks: AgentInputCallbacks
): void {
  closeDialog();

  const dialog = createDialogElement();
  state.element = dialog;
  state.callbacks = callbacks;

  // Show selection if there is one
  const selectionEl = dialog.querySelector('.agent-input-dialog-selection') as HTMLElement;
  if (context.selection.trim()) {
    selectionEl.textContent = context.selection.length > 200
      ? context.selection.slice(0, 200) + '...'
      : context.selection;
    selectionEl.classList.add('has-selection');
  }

  // Position and show
  positionDialog(dialog, context.position);

  // Animate in
  requestAnimationFrame(() => {
    dialog.classList.add('visible');
  });

  // Focus textarea
  const textarea = dialog.querySelector('.agent-input-dialog-textarea') as HTMLTextAreaElement;
  setTimeout(() => {
    textarea?.focus();
  }, 50);

  // Wire up event handlers
  const closeBtn = dialog.querySelector('.agent-input-dialog-close') as HTMLButtonElement;
  const cancelBtn = dialog.querySelector('.agent-input-dialog-cancel') as HTMLButtonElement;
  const submitBtn = dialog.querySelector('.agent-input-dialog-submit') as HTMLButtonElement;
  const quickActions = dialog.querySelectorAll('.agent-input-quick-action');

  closeBtn?.addEventListener('click', closeDialog);
  cancelBtn?.addEventListener('click', closeDialog);
  submitBtn?.addEventListener('click', submitDialog);

  // Quick actions
  quickActions.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = (btn as HTMLElement).dataset.action;
      if (action && state.callbacks) {
        // Use quick action prompt
        const prompts: Record<string, string> = {
          'fix-grammar': 'Fix any grammar issues in this text',
          'improve-clarity': 'Improve the clarity of this text while keeping the meaning',
          'make-shorter': 'Make this text more concise without losing important information',
        };
        state.callbacks.onSubmit(prompts[action] || action);
        closeDialog();
      }
    });
  });

  state.detach = attachDismissibleMenu({
    container: dialog,
    onKeyDown: (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        submitDialog();
        e.preventDefault();
        e.stopPropagation();
        return true;
      }
    },
    onDismiss: () => {
      dialog.classList.remove('visible');
      const element = state.element;
      const callbacks = state.callbacks;
      setTimeout(() => {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      }, 150);
      state.element = null;
      callbacks?.onCancel();
      state.callbacks = null;
      state.detach = null;
    },
  });
}

/**
 * Hide the agent input dialog
 */
export function hideAgentInputDialog(): void {
  closeDialog();
}
