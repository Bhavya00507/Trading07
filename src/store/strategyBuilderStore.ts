import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  name: string;
  author: string;
  category: string;
  rating: number;
  downloads: number;
  win_rate: string;
  description: string;
}

interface StrategyBuilderState {
  strategyName: string;
  description: string;
  category: string;
  version: string;
  nodes: StrategyNodeData[];
  edges: StrategyEdgeData[];
  selectedNodeId: string | null;

  // Validation & AI
  validationErrors: { type: string; message: string; nodeId?: string }[];
  aiSuggestions: string[];

  // Code Gen & Import
  targetLang: string;
  generatedCode: string;

  // Optimization & Backtest
  optimizationResults: any[];
  backtestResult: any | null;

  // Marketplace & Versions
  marketplaceItems: StrategyMarketplaceItem[];
  versions: { version: string; date: string; changeLog: string }[];

  // Actions
  setStrategyMeta: (name: string, description?: string, category?: string) => void;
  addNode: (node: StrategyNodeData) => void;
  removeNode: (id: string) => void;
  connectNodes: (source: string, target: string) => void;
  updateNodeData: (id: string, newParams: Record<string, any>) => void;
  selectNode: (id: string | null) => void;

  // API Actions
  validateGraph: () => Promise<void>;
  aiGenerateStrategy: (prompt: string) => Promise<void>;
  aiImproveStrategy: () => Promise<void>;
  generateCode: (targetLang: string) => Promise<void>;
  importCode: (codeStr: string, sourceLang: string) => Promise<void>;
  runOptimization: (method?: string) => Promise<void>;
  fetchMarketplace: () => Promise<void>;
}

export const useStrategyBuilderStore = create<StrategyBuilderState>()(
  persist(
    (set, get) => ({
      strategyName: 'Golden Cross & ATR Trailing Stop',
      description: 'Institutional trend-following strategy using EMA 20/50 crossover with ATR trailing stop loss.',
      category: 'Trend',
      version: '1.0.0',
      nodes: [
        { id: 'n_1', type: 'INDICATOR', label: 'Fast EMA (20)', category: 'Indicator', position: { x: 100, y: 120 }, data: { indicator: 'EMA', period: 20 } },
        { id: 'n_2', type: 'INDICATOR', label: 'Slow EMA (50)', category: 'Indicator', position: { x: 100, y: 240 }, data: { indicator: 'EMA', period: 50 } },
        { id: 'n_3', type: 'LOGIC', label: 'Cross Above', category: 'Logic', position: { x: 320, y: 180 }, data: { operator: 'crosses_above' } },
        { id: 'n_4', type: 'RISK', label: 'ATR Trailing Stop (1.5x)', category: 'Risk', position: { x: 520, y: 180 }, data: { sl_pct: 1.5, tp_pct: 3.0, risk_pct: 1.0 } },
        { id: 'n_5', type: 'ORDER', label: 'Market Buy Order', category: 'Order', position: { x: 720, y: 180 }, data: { side: 'buy', quantity: 1.0 } },
      ],
      edges: [
        { id: 'e1-3', source: 'n_1', target: 'n_3' },
        { id: 'e2-3', source: 'n_2', target: 'n_3' },
        { id: 'e3-4', source: 'n_3', target: 'n_4' },
        { id: 'e4-5', source: 'n_4', target: 'n_5' },
      ],
      selectedNodeId: 'n_1',

      validationErrors: [],
      aiSuggestions: [],
      targetLang: 'Pine Script v6',
      generatedCode: '',
      optimizationResults: [],
      backtestResult: null,

      marketplaceItems: [],
      versions: [
        { version: '1.0.0', date: '2026-07-31', changeLog: 'Initial visual strategy build' },
      ],

      setStrategyMeta: (name, description = '', category = 'Trend') => set({ strategyName: name, description, category }),

      addNode: (node) => set((state) => ({ nodes: [...state.nodes, node], selectedNodeId: node.id })),

      removeNode: (id) => set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      })),

      connectNodes: (source, target) => {
        const edgeId = `e_${source}_${target}_${Date.now()}`;
        set((state) => ({ edges: [...state.edges, { id: edgeId, source, target }] }));
      },

      updateNodeData: (id, newParams) => set((state) => ({
        nodes: state.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...newParams } } : n)),
      })),

      selectNode: (id) => set({ selectedNodeId: id }),

      validateGraph: async () => {
        const { nodes, edges } = get();
        try {
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/validate', {
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
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/ai-generate', {
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
              selectedNodeId: data.nodes?.[0]?.id || null,
            });
          }
        } catch (e) {
          console.error('AI strategy generation failed:', e);
        }
      },

      aiImproveStrategy: async () => {
        const { nodes, edges } = get();
        try {
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/ai-improve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, edges }),
          });
          if (res.ok) {
            const data = await res.json();
            set({
              nodes: data.improved_nodes || nodes,
              aiSuggestions: data.suggestions || [],
            });
          }
        } catch (e) {
          console.error('AI strategy improvement failed:', e);
        }
      },

      generateCode: async (targetLang) => {
        const { nodes, edges } = get();
        try {
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/generate-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, edges, target_lang: targetLang }),
          });
          if (res.ok) {
            const data = await res.json();
            set({ targetLang, generatedCode: data.code });
          }
        } catch (e) {
          console.error('Code generation failed:', e);
        }
      },

      importCode: async (codeStr, sourceLang) => {
        try {
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/import-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code_str: codeStr, source_lang: sourceLang }),
          });
          if (res.ok) {
            const data = await res.json();
            set({
              strategyName: data.name,
              description: data.description,
              nodes: data.nodes,
              edges: data.edges,
            });
          }
        } catch (e) {
          console.error('Code import failed:', e);
        }
      },

      runOptimization: async (method = 'Grid Search') => {
        const { nodes, edges } = get();
        try {
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, edges, method }),
          });
          if (res.ok) {
            const data = await res.json();
            set({ optimizationResults: data.results || [] });
          }
        } catch (e) {
          console.error('Optimization sweep failed:', e);
        }
      },

      fetchMarketplace: async () => {
        try {
          const res = await fetch('http://127.0.0.1:8000/api/strategy-builder/marketplace');
          if (res.ok) {
            const data = await res.json();
            set({ marketplaceItems: data });
          }
        } catch (e) {
          console.error('Marketplace fetch failed:', e);
        }
      },
    }),
    {
      name: 'strategy-builder-store-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
