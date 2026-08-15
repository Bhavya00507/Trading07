import { createWithEqualityFn } from 'zustand/traditional';
import { immer } from 'zustand/middleware/immer';
import type { Position } from '../types';

export interface PositionState {
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  updatePosition: (position: Position) => void;
}

export const usePositionStore = createWithEqualityFn<PositionState>()(
  immer((set) => ({
    positions: [],
    setPositions: (incomingPositions) =>
      set((state) => {
        const optimistic = state.positions.filter((p) => (p as any).isOptimistic);
        const incomingActive = incomingPositions.filter((p) => p.quantity !== 0);
        const nextPositions: Position[] = [];
        const confirmedSymbols = new Set(incomingActive.map((p) => p.symbol));

        incomingActive.forEach((incoming) => {
          const existing = state.positions.find(
            (p) =>
              p.id === incoming.id ||
              (p.symbol === incoming.symbol && (p as any).isOptimistic)
          );
          if (existing) {
            const merged = { ...existing, ...incoming };
            delete (merged as any).isOptimistic;
            nextPositions.push(merged);
          } else {
            nextPositions.push(incoming);
          }
        });

        optimistic.forEach((opt) => {
          if (!confirmedSymbols.has(opt.symbol)) {
            nextPositions.push(opt);
          }
        });

        state.positions = nextPositions;
      }),
    updatePosition: (position) =>
      set((state) => {
        if (position.quantity === 0) {
          state.positions = state.positions.filter(
            (p) => p.id !== position.id && p.symbol !== position.symbol
          );
          return;
        }

        if (!(position as any).isOptimistic) {
          const optIdx = state.positions.findIndex(
            (p) => p.symbol === position.symbol && (p as any).isOptimistic
          );
          if (optIdx !== -1) {
            state.positions[optIdx] = { ...state.positions[optIdx], ...position };
            delete (state.positions[optIdx] as any).isOptimistic;
            return;
          }
        }

        const idx = state.positions.findIndex((p) => p.id === position.id);
        if (idx !== -1) {
          state.positions[idx] = { ...state.positions[idx], ...position };
        } else {
          state.positions.push(position);
        }
      }),
  }))
);
