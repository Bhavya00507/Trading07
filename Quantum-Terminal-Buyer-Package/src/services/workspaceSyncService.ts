import { useWorkspaceStore } from '../store/workspaceStore';

class WorkspaceSyncService {
  private timer: any = null;

  public initializeAutoSave() {
    // Initial fetch of workspaces
    useWorkspaceStore.getState().loadWorkspaces();
    useWorkspaceStore.getState().loadTemplates();

    // Set 5-second interval timer
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.triggerAutoSave();
    }, 5000);

    // Save on beforeunload / window close
    window.addEventListener('beforeunload', () => {
      this.triggerAutoSaveSync();
    });

    // Auto sync on online reconnect
    window.addEventListener('online', () => {
      useWorkspaceStore.getState().setSyncStatus('syncing');
      this.triggerAutoSaveSync();
    });

    window.addEventListener('offline', () => {
      useWorkspaceStore.getState().setSyncStatus('offline');
    });
  }

  public triggerAutoSave() {
    const store = useWorkspaceStore.getState();
    const curr = store.currentWorkspace;
    if (!curr) return;

    // Collect global app state layout snapshot
    const layoutSnapshot = {
      timestamp: Date.now(),
      theme: 'dark',
      activeSymbol: 'BTCUSDT',
      activeTab: 'chart',
      autoSaveIntervalSec: 5,
      deviceInfo: 'Web Desktop'
    };

    store.updateCurrentWorkspaceLayout(layoutSnapshot);
  }

  public triggerAutoSaveSync() {
    const store = useWorkspaceStore.getState();
    const curr = store.currentWorkspace;
    if (!curr) return;

    const layoutSnapshot = {
      timestamp: Date.now(),
      theme: 'dark',
      deviceInfo: 'Web Desktop'
    };

    try {
      const blob = new Blob([JSON.stringify({ workspace_id: curr.id, layout_data: layoutSnapshot })], { type: 'application/json' });
      navigator.sendBeacon('/api/workspace/' + curr.id, blob);
    } catch {}
  }
}

export const workspaceSyncService = new WorkspaceSyncService();
