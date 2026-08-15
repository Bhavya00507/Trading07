// src/components/BuyerDemo/BuyerDemoHeaderBadge.tsx
import React from 'react';
import './BuyerDemo.css';

interface BuyerDemoHeaderBadgeProps {
  onClick?: () => void;
}

export const BuyerDemoHeaderBadge: React.FC<BuyerDemoHeaderBadgeProps> = ({ onClick }) => {
  return (
    <div 
      className="demo-mode-badge" 
      onClick={onClick} 
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title="Quantum Terminal is running in Buyer Presentation Demo Mode"
    >
      <span className="demo-mode-dot" />
      <span>DEMO MODE</span>
    </div>
  );
};

export interface FeatureStatusBadgeProps {
  type: 'paper' | 'simulated' | 'integration';
  customLabel?: string;
}

export const FeatureStatusBadge: React.FC<FeatureStatusBadgeProps> = ({ type, customLabel }) => {
  let label = customLabel;
  if (!label) {
    if (type === 'paper') label = 'Paper Execution';
    else if (type === 'simulated') label = 'Simulated Data';
    else if (type === 'integration') label = 'Integration Required';
  }

  return (
    <span className={`feature-status-badge ${type}`}>
      {label}
    </span>
  );
};
