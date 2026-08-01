import React from 'react';
import { ErrorPanel } from './ErrorPanel';

export const CompilerConsole: React.FC<{
  compileResult: any;
  execResult: any;
  onRun: () => void;
  onCompile: () => void;
}> = ({ compileResult, execResult, onRun, onCompile }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', backgroundColor: '#090d16', padding: 8, borderTop: '1px solid #1e293b', fontSize: 10, color: '#e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 11 }}>⚙️ COMPILER & SANDBOX EXECUTION CONSOLE</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onCompile} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#38bdf8', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
            🛠️ Compile Code
          </button>
          <button onClick={onRun} style={{ padding: '3px 8px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 800, cursor: 'pointer' }}>
            ▶ Run Script
          </button>
        </div>
      </div>

      {compileResult && (
        <ErrorPanel errors={compileResult.errors || []} warnings={compileResult.warnings || []} />
      )}

      {execResult && execResult.success && (
        <div style={{ padding: 8, borderRadius: 4, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ color: '#10b981', fontWeight: 800 }}>
            🚀 Execution Completed cleanly in {execResult.execution_time_ms} ms (Compile: {execResult.compile_time_ms} ms)
          </div>
          {execResult.performance_metrics && (
            <div style={{ display: 'flex', gap: 12, color: '#94a3b8', marginTop: 4 }}>
              <span>Total Return: <strong style={{ color: '#10b981' }}>+{execResult.performance_metrics.total_return_pct}%</strong></span>
              <span>Win Rate: <strong style={{ color: '#38bdf8' }}>{execResult.performance_metrics.win_rate_pct}%</strong></span>
              <span>Profit Factor: <strong>{execResult.performance_metrics.profit_factor}</strong></span>
              <span>Max Drawdown: <strong style={{ color: '#ef4444' }}>-{execResult.performance_metrics.max_drawdown_pct}%</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
