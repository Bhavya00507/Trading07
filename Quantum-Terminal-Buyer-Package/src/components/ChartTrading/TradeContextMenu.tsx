import React from 'react';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconTarget,
  IconBell,
  IconX,
  IconArrowRightLeft,
} from './Icons';

export interface TradeContextMenuProps {
  x: number;
  y: number;
  price: number;
  symbol: string;
  onSelectAction: (action: string, price: number) => void;
  onClose: () => void;
}

export const TradeContextMenu: React.FC<TradeContextMenuProps> = ({
  x,
  y,
  price,
  symbol,
  onSelectAction,
  onClose,
}) => {
  const formattedPrice = price.toFixed(2);

  const menuItems = [
    { key: 'buy_market', label: `Buy Market (${symbol})`, icon: <IconTrendingUp className="w-4 h-4 text-emerald-400" /> },
    { key: 'sell_market', label: `Sell Market (${symbol})`, icon: <IconTrendingDown className="w-4 h-4 text-red-400" /> },
    { divider: true },
    { key: 'buy_limit', label: `Buy Limit @ ${formattedPrice}`, icon: <IconTarget className="w-4 h-4 text-emerald-400" /> },
    { key: 'sell_limit', label: `Sell Limit @ ${formattedPrice}`, icon: <IconTarget className="w-4 h-4 text-red-400" /> },
    { key: 'buy_stop', label: `Buy Stop @ ${formattedPrice}`, icon: <IconTrendingUp className="w-4 h-4 text-cyan-400" /> },
    { key: 'sell_stop', label: `Sell Stop @ ${formattedPrice}`, icon: <IconTrendingDown className="w-4 h-4 text-amber-400" /> },
    { divider: true },
    { key: 'create_alert', label: `Create Alert @ ${formattedPrice}`, icon: <IconBell className="w-4 h-4 text-amber-300" /> },
    { key: 'hline', label: 'Place Horizontal Line', icon: <span className="text-slate-400 font-bold">—</span> },
    { key: 'trendline', label: 'Place Trendline', icon: <span className="text-slate-400 font-bold">╱</span> },
    { divider: true },
    { key: 'cancel_pending', label: 'Cancel Pending Orders', icon: <IconX className="w-4 h-4 text-red-400" /> },
    { key: 'close_position', label: 'Close Active Position', icon: <IconX className="w-4 h-4 text-slate-400" /> },
    { key: 'reverse_position', label: 'Reverse Position', icon: <IconArrowRightLeft className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <div
      className="fixed z-50 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl font-sans text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 mb-1 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span>CHART TRADING MENU</span>
        <span className="text-amber-300 font-bold">{formattedPrice}</span>
      </div>

      {menuItems.map((item, idx) => {
        if (item.divider) {
          return <div key={`div_${idx}`} className="my-1 border-t border-slate-800" />;
        }

        return (
          <button
            key={item.key}
            onClick={() => {
              onSelectAction(item.key!, price);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/90 text-left transition font-medium"
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
