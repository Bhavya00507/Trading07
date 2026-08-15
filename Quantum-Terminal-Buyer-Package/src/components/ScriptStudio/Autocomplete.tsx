import React from 'react';

export const Autocomplete: React.FC<{
  suggestions: string[];
  onSelect: (item: string) => void;
}> = ({ suggestions, onSelect }) => {
  if (!suggestions.length) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 40, left: 100, zIndex: 100,
      backgroundColor: '#0f172a', border: '1px solid #38bdf8', borderRadius: 4,
      padding: 4, width: 220, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', fontSize: 10
    }}>
      <div style={{ color: '#38bdf8', fontWeight: 800, padding: '2px 4px', borderBottom: '1px solid #1e293b' }}>
        💡 INTELLISENSE SUGGESTIONS
      </div>
      {suggestions.map((item, idx) => (
        <div
          key={idx}
          onClick={() => onSelect(item)}
          style={{
            padding: '4px 6px', cursor: 'pointer', borderRadius: 2, color: '#f8fafc',
            backgroundColor: idx === 0 ? '#1e293b' : 'transparent'
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
};
