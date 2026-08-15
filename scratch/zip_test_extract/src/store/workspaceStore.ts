import { create } from 'zustand';

export interface WorkspaceItem {
  id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  is_favorite?: boolean;
  is_active?: boolean;
  version?: number;
  updated_at?: number;
  device_info?: string;
  layout?: any;
}

export interface WorkspaceHistoryItem {
  id: string;
  workspace_id: string;
  version: number;
  device_info: string;
  created_at: number;
}

export interface WorkspaceStoreState {
  currentWorkspaceId: string;
  currentWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
  templates: any[];
  versionHistory: WorkspaceHistoryItem[];
  syncStatus: 'synced' | 'saving' | 'syncing' | 'offline' | 'error';
  lastSavedAt: number | null;
  autoSaveIntervalSec: number;
  isManagerOpen: boolean;

  setSyncStatus: (status: 'synced' | 'saving' | 'syncing' | 'offline' | 'error') => void;
  setManagerOpen: (open: boolean) => void;
  loadWorkspaces: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  selectWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, description?: string, layout?: any) => Promise<WorkspaceItem | null>;
  updateCurrentWorkspaceLayout: (layoutData: any) => Promise<void>;
  restoreVersion: (workspaceId: string, version: number) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  importWorkspaceFile: (fileContent: str) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceStoreState>((set, get) => ({
  currentWorkspaceId: 'ws-default-scalping',
  currentWorkspace: null,
  workspaces: [],
  templates: [],
  versionHistory: [],
  syncStatus: 'synced',
  lastSavedAt: Date.now(),
  autoSaveIntervalSec: 5,
  isManagerOpen: false,

  setSyncStatus: (status) => set({ syncStatus: status }),
  setManagerOpen: (open) => set({ isManagerOpen: open }),

  loadWorkspaces: async () => {
    try {
      const res = await fetch('/api/workspace');
      if (res.ok) {
        const data = await res.json();
        const list: WorkspaceItem[] = data.workspaces || [];
        set({ workspaces: list });
        if (list.length > 0 && !get().currentWorkspace) {
          const active = list.find((w) => w.is_active) || list[0];
          set({ currentWorkspaceId: active.id, currentWorkspace: active });
        }
      }
    } catch {
      set({ syncStatus: 'offline' });
    }
  },

  loadTemplates: async () => {
    try {
      const res = await fetch('/api/workspace/templates');
      if (res.ok) {
        const data = await res.json();
        set({ templates: data.templates || [] });
      }
    } catch {}
  },

  selectWorkspace: async (id: string) => {
    try {
      set({ syncStatus: 'syncing' });
      const item = get().workspaces.find((w) => w.id === id);
      if (item) {
        set({ currentWorkspaceId: id, currentWorkspace: item, syncStatus: 'synced', lastSavedAt: Date.now() });
        // Fetch history
        const hRes = await fetch(`/api/workspace/history/${id}`);
        if (hRes.ok) {
          const hData = await hRes.json();
          set({ versionHistory: hData.history || [] });
        }
      }
    } catch {
      set({ syncStatus: 'error' });
    }
  },

  createWorkspace: async (name: string, description = '', layoutData = {}) => {
    try {
      set({ syncStatus: 'saving' });
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          layout_data: layoutData
        })
      });
      if (res.ok) {
        const newWs = await res.json();
        set((state) => ({
          workspaces: [newWs, ...state.workspaces],
          currentWorkspaceId: newWs.id,
          currentWorkspace: newWs,
          syncStatus: 'synced',
          lastSavedAt: Date.now()
        }));
        return newWs;
      }
    } catch {
      set({ syncStatus: 'error' });
    }
    return null;
  },

  updateCurrentWorkspaceLayout: async (layoutData: any) => {
    const curr = get().currentWorkspace;
    if (!curr) return;
    try {
      set({ syncStatus: 'saving' });
      const res = await fetch(`/api/workspace/${curr.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layout_data: layoutData,
          device_info: 'Web Desktop'
        })
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          currentWorkspace: updated,
          workspaces: state.workspaces.map((w) => (w.id === updated.id ? updated : w)),
          syncStatus: 'synced',
          lastSavedAt: Date.now()
        }));
      }
    } catch {
      set({ syncStatus: 'offline' });
      // Backup to localStorage offline
      try {
        localStorage.setItem(`qt_ws_backup_${curr.id}`, JSON.stringify(layoutData));
      } catch {}
    }
  },

  restoreVersion: async (workspaceId: string, version: number) => {
    try {
      set({ syncStatus: 'saving' });
      const res = await fetch(`/api/workspace/restore/${workspaceId}/${version}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        set((state) => ({
          currentWorkspace: data.workspace,
          workspaces: state.workspaces.map((w) => (w.id === workspaceId ? data.workspace : w)),
          syncStatus: 'synced',
          lastSavedAt: Date.now()
        }));
      }
    } catch {
      set({ syncStatus: 'error' });
    }
  },

  deleteWorkspace: async (id: string) => {
    try {
      const res = await fetch(`/api/workspace/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set((state) => {
          const filtered = state.workspaces.filter((w) => w.id !== id);
          const nextActive = filtered[0] || null;
          return {
            workspaces: filtered,
            currentWorkspaceId: nextActive ? nextActive.id : '',
            currentWorkspace: nextActive
          };
        });
      }
    } catch {}
  },

  toggleFavorite: async (id: string) => {
    const ws = get().workspaces.find((w) => w.id === id);
    if (!ws) return;
    try {
      const res = await fetch(`/api/workspace/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !ws.is_favorite })
      });
      if (res.ok) {
        const updated = await res.json();
        set((state) => ({
          workspaces: state.workspaces.map((w) => (w.id === id ? updated : w))
        }));
      }
    } catch {}
  },

  importWorkspaceFile: async (fileContent: string) => {
    try {
      set({ syncStatus: 'saving' });
      const res = await fetch('/api/workspace/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_content: fileContent })
      });
      if (res.ok) {
        const imported = await res.json();
        set((state) => ({
          workspaces: [imported, ...state.workspaces],
          currentWorkspaceId: imported.id,
          currentWorkspace: imported,
          syncStatus: 'synced',
          lastSavedAt: Date.now()
        }));
      }
    } catch {
      set({ syncStatus: 'error' });
    }
  }
}));
