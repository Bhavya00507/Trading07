import React from 'react';

interface POCOverlayProps {
  pocPrice: number;
  vahPrice: number;
  valPrice: number;
  developingPoc?: { time: number; poc_price: number }[];
  showValueArea?: boolean;
  pocColor?: string;
  vaColor?: string;
  minPrice: number;
  maxPrice: number;
  height: number;
}

export const POCOverlay: React.FC<POCOverlayProps> = ({
  pocPrice,
  vahPrice,
  valPrice,
  showValueArea = true,
  pocColor = '#f59e0b',
  vaColor = 'rgba(59, 130, 246, 0.25)',
  minPrice,
  maxPrice,
  height,
}) => {
  if (maxPrice <= minPrice || height <= 0) return null;

  const priceToY = (p: number) => {
    const ratio = (maxPrice - p) / (maxPrice - minPrice);
    return Math.max(0, Math.min(height, ratio * height));
  };

  const pocY = priceToY(pocPrice);
  const vahY = priceToY(vahPrice);
  const valY = priceToY(valPrice);

  const vaTop = Math.min(vahY, valY);
  const vaHeight = Math.abs(valY - vahY);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
      {/* 70% Value Area Region Highlight */}
      {showValueArea && vahPrice > 0 && valPrice > 0 && (
        <rect
          x="0"
          y={vaTop}
          width="100%"
          height={vaHeight}
          fill={vaColor}
          stroke="rgba(59, 130, 246, 0.5)"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
      )}

      {/* Point of Control (POC) Line */}
      {pocPrice > 0 && (
        <g>
          <line
            x1="0"
            y1={pocY}
            x2="100%"
            y2={pocY}
            stroke={pocColor}
            strokeWidth="2"
            strokeDasharray="6,3"
          />
          <text
            x="10"
            y={pocY - 4}
            fill={pocColor}
            fontSize="10"
            fontWeight="bold"
            className="font-mono uppercase tracking-wider"
          >
            POC: {pocPrice.toFixed(2)}
          </text>
        </g>
      )}

      {/* VAH & VAL Labels */}
      {showValueArea && vahPrice > 0 && (
        <text
          x="10"
          y={vahY - 4}
          fill="#60a5fa"
          fontSize="9"
          fontWeight="semibold"
          className="font-mono"
        >
          VAH: {vahPrice.toFixed(2)}
        </text>
      )}

      {showValueArea && valPrice > 0 && (
        <text
          x="10"
          y={valY + 12}
          fill="#60a5fa"
          fontSize="9"
          fontWeight="semibold"
          className="font-mono"
        >
          VAL: {valPrice.toFixed(2)}
        </text>
      )}
    </svg>
  );
};
