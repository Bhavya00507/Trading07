/**
 * FloatingPositionCard.tsx
 * Floating live position widget — Quantum Terminal UI.
 * Draggable, ultra-compact, glassmorphism floating position card.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PositionCard, PositionCardData } from './PositionCard';

export interface FloatingPositionData extends PositionCardData {
  leverage: number;
}

interface FloatingPositionCardProps {
  position: FloatingPositionData;
  onClose: () => void;
  onReverse?: () => void;
  onPartialClose?: (pct: number) => void;
  onBreakEven?: () => void;
}

export const FloatingPositionCard: React.FC<FloatingPositionCardProps> = ({
  position,
  onClose,
}) => {
  return <PositionCard position={position} onClose={onClose} />;
};
