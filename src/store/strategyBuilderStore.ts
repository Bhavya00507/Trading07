import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getApiUrl } from '../services/config';

export interface StrategyNodeData {
  id: string;
  type: 'INDICATOR' | 'LOGIC' | 'RISK' | 'ORDER' | 'TIMER' | 'AI' | 'ACTION';
  label: string;
  category: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface StrategyEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface StrategyMarketplaceItem {
  id: string;
  title: string;
  author: string;
  rating: number;
  downloads: number;
  winRatePct: number;
  description: string;
  nodesCount: number;
}

interface StrategyBuilderState {
  strategyId: string;
  strategyName: string;
  description: string;
  category: string;
  nodes: StrategyNodeData[];
  edges: StrategyEdgeData[];
  selectedNodeId: string | null;
  validationErrors: string[];
  marketplaceItems: StrategyMarketplaceItem[];
  generatedScriptCode: string;
  
  // Actions
  setStrategyName: (name: string) => void;
  setDescription: (desc: string) => void;
  setCategory: (cat: string) => void;
  addNode: (node: Omit<StrategyNodeData, 'id'>) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodeData: (id: string, data: Record<string, any>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: Omit<StrategyEdgeData, 'id'>) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  
  validateGraph: () => Promise<void>;
  aiGenerateStrategy: (prompt: string) => Promise<void>;
  aiImproveStrategy: () => Promise<void>;
  generateScriptCode: () => Promise<string>;
  importScriptCode: (code: string) => Promise<void>;
  optimizeParameters: () => Promise<void>;
  fetchMarketplaceItems: () => Promise<void>;
  clearCanvas: () => void;
}

export const useStrategyBuilderStore = create<StrategyBuilderState>()(
  persist(
    (set, get) => ({
      strategyId: 'str-new-001',
      strategyName: 'My Quant Strategy',
      description: 'Custom visual strategy graph',
      category: 'TREND_FOLLOWING',
      nodes: [
        {
          id: 'node-1',
          type: 'INDICATOR',
          label: 'EMA (20/50) Cross',
          category: 'Trend',
          position: { x: 50, y: 100 },
          data: { periodFast: 20, periodSlow: 50 }
        },
        {
          id: 'node-2',
          type: 'LOGIC',
          label: 'RSI Filter < 70',
          category: 'Filter',
          position: { x: 280, y: 100 },
          data: { period: 14, maxThreshold: 70 }
        },
        {
          id: 'node-3',
          type: 'ORDER',
          label: 'Market Buy Order',
          category: 'Execution',
          position: { x: 520, y: 100 },
          data: { sizeLots: 0.1, stopLossPips: 20, takeProfitPips: 40 }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'node-1', target: 'node-2', label: 'CROSS_OVER' },
        { id: 'e2-3', source: 'node-2', target: 'node-3', label: 'TRUE' }
      ],
      selectedNodeId: null,
      validationErrors: [],
      marketplaceItems: [],
      generatedScriptCode: '',

      setStrategyName: (strategyName) => set({ strategyName }),
      setDescription: (description) => set({ description }),
      setCategory: (category) => set({ category }),

      addNode: (nodeData) => set((state) => {
        const newId = `node-${Date.now()}`;
        return {
          nodes: [...state.nodes, { ...nodeData, id: newId }],
          selectedNodeId: newId
        };
      }),

      updateNodePosition: (id, position) => set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, position } : n))
      })),

      updateNodeData: (id, data) => set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n))
      })),

      removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
      })),

      addEdge: (edgeData) => set((state) => {
        const newId = `edge-${Date.now()}`;
        return {
          edges: [...state.edges, { ...edgeData, id: newId }]
        };
      }),

      removeEdge: (id) => set((state) => ({
        edges: state.edges.filter((e) => e.id !== id)
      })),

      selectNode: (id) => set({ selectedNodeId: id }),

      validateGraph: async () => {
        const { nodes, edges } = get();
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, edges }),
          });
          if (res.ok) {
            const data = await res.json();
            set({ validationErrors: data.errors || [] });
          }
        } catch (e) {
          console.error('Validation request failed:', e);
        }
      },

      aiGenerateStrategy: async (prompt) => {
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/ai-generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });
          if (res.ok) {
            const data = await res.json();
            set({
              strategyName: data.name,
              description: data.description,
              category: data.category,
              nodes: data.nodes,
              edges: data.edges,
              generatedScriptCode: data.script_code || ''
            });
          }
        } catch (e) {
          console.error('AI strategy generation failed:', e);
        }
      },

      aiImproveStrategy: async () => {
        const { nodes, edges } = get();
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/ai-improve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, edges }),
          });
          if (res.ok) {
            const data = await res.json();
            set({
              nodes: data.nodes,
              edges: data.edges,
              description: data.description || get().description
            });
          }
        } catch (e) {
          console.error('AI strategy improvement failed:', e);
        }
      },

      generateScriptCode: async () => {
        const { nodes, edges, strategyName } = get();
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/generate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: strategyName, nodes, edges }),
          });
          if (res.ok) {
            const data = await res.json();
            set({ generatedScriptCode: data.code });
            return data.code;
          }
        } catch (e) {
          console.error('Script code generation failed:', e);
        }
        return '';
      },

      importScriptCode: async (code) => {
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/import-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });
          if (res.ok) {
            const data = await res.json();
            set({
              strategyName: data.name,
              nodes: data.nodes,
              edges: data.edges,
              generatedScriptCode: code
            });
          }
        } catch (e) {
          console.error('Script import failed:', e);
        }
      },

      optimizeParameters: async () => {
        const { nodes, edges } = get();
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, edges }),
          });
          if (res.ok) {
            const data = await res.json();
            set({ nodes: data.nodes });
          }
        } catch (e) {
          console.error('Optimization failed:', e);
        }
      },

      fetchMarketplaceItems: async () => {
        try {
          const api = getApiUrl();
          const res = await fetch(`${api}/api/strategy-builder/marketplace`);
          if (res.ok) {
            const data = await res.json();
            set({ marketplaceItems: data.items || [] });
          }
        } catch (e) {
          console.error('Marketplace fetch failed:', e);
        }
      },

      clearCanvas: () => set({
        nodes: [],
        edges: [],
        selectedNodeId: null,
        validationErrors: [],
        generatedScriptCode: ''
      })
    }),
    {
      name: 'quantum-strategy-builder-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
