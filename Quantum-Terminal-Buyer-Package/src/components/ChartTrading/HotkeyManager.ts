export interface HotkeyBindings {
  buy: string;
  sell: string;
  cancelSelected: string;
  cancelDrag: string;
  undo: string;
  redo: string;
  centerChart: string;
}

export const DEFAULT_HOTKEY_BINDINGS: HotkeyBindings = {
  buy: 'KeyB',
  sell: 'KeyS',
  cancelSelected: 'Delete',
  cancelDrag: 'Escape',
  undo: 'KeyZ',
  redo: 'KeyY',
  centerChart: 'Space',
};

export type HotkeyActionHandler = (action: string) => void;

export class HotkeyManager {
  private bindings: HotkeyBindings;
  private onAction: HotkeyActionHandler;
  private isEnabled: boolean = true;

  constructor(onAction: HotkeyActionHandler, customBindings?: Partial<HotkeyBindings>) {
    this.onAction = onAction;
    this.bindings = { ...DEFAULT_HOTKEY_BINDINGS, ...customBindings };
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public attach(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
    }
  }

  public detach(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    // Ignore keypresses when typing inside input elements
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true')
    ) {
      return;
    }

    const code = event.code;
    const ctrlOrCmd = event.ctrlKey || event.metaKey;

    if (ctrlOrCmd && code === this.bindings.undo) {
      event.preventDefault();
      this.onAction('undo');
    } else if (ctrlOrCmd && code === this.bindings.redo) {
      event.preventDefault();
      this.onAction('redo');
    } else if (code === this.bindings.buy) {
      event.preventDefault();
      this.onAction('buy_market');
    } else if (code === this.bindings.sell) {
      event.preventDefault();
      this.onAction('sell_market');
    } else if (code === this.bindings.cancelSelected) {
      event.preventDefault();
      this.onAction('cancel_selected');
    } else if (code === this.bindings.cancelDrag) {
      event.preventDefault();
      this.onAction('cancel_drag');
    } else if (code === this.bindings.centerChart) {
      event.preventDefault();
      this.onAction('center_chart');
    }
  }
}
