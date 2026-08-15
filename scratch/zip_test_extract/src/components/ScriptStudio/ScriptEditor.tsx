import React, { useState, useEffect } from 'react';
import { ScriptExplorer } from './ScriptExplorer';
import { CompilerConsole } from './CompilerConsole';
import { Autocomplete } from './Autocomplete';
import { IndicatorLibrary } from './IndicatorLibrary';
import { StrategyLibrary } from './StrategyLibrary';
import { TemplateBrowser } from './TemplateBrowser';
import { Marketplace } from './Marketplace';

export const ScriptEditor: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [scripts, setScripts] = useState<any[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<string>('tpl-ema-rsi-cross');
  const [activeTab, setActiveTab] = useState<'editor' | 'indicators' | 'strategies' | 'templates' | 'marketplace'>('editor');
  
  const [code, setCode] = useState<string>('');
  const [scriptName, setScriptName] = useState<string>('');
  const [language, setLanguage] = useState<string>('qscript');
  const [compileResult, setCompileResult] = useState<any>(null);
  const [execResult, setExecResult] = useState<any>(null);

  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<bool>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const fetchScripts = () => {
    fetch('/api/scripts')
      .then(res => res.json())
      .then(d => {
        setScripts(d.scripts || []);
        if (d.scripts?.length > 0 && !code) {
          const first = d.scripts[0];
          setActiveScriptId(first.id);
          setCode(first.code);
          setScriptName(first.name);
          setLanguage(first.language);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (isOpen) fetchScripts();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectScript = (id: string) => {
    const s = scripts.find(x => x.id === id);
    if (s) {
      setActiveScriptId(s.id);
      setCode(s.code);
      setScriptName(s.name);
      setLanguage(s.language);
      setActiveTab('editor');
    }
  };

  const handleCreateNew = (type: string) => {
    const newName = `New ${type.toUpperCase()} Script`;
    const newCode = type === 'strategy' 
      ? '# QScript Strategy\nema9 = ta.ema(close, 9)\nif ta.crossover(ema9, close):\n    strategy.buy()\n'
      : '# QScript Indicator\nplot(ta.rsi(close, 14), title="RSI")\n';

    fetch('/api/scripts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, script_type: type, language: 'qscript', code: newCode })
    })
      .then(res => res.json())
      .then(d => {
        fetchScripts();
        handleSelectScript(d.id);
      });
  };

  const handleCompile = async () => {
    try {
      const res = await fetch('/api/scripts/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language })
      });
      if (res.ok) {
        const data = await res.json();
        setCompileResult(data);
      }
    } catch {}
  };

  const handleRun = async () => {
    try {
      const res = await fetch('/api/scripts/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, script_type: 'strategy' })
      });
      if (res.ok) {
        const data = await res.json();
        setExecResult(data);
      }
    } catch {}
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/scripts/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, language })
      });
      if (res.ok) {
        const data = await res.json();
        setCode(data.generated_code);
        setAiPrompt('');
      }
    } catch {}
    setAiLoading(false);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    if (val.endsWith('ta.')) {
      setSuggestions(['ta.ema(series, length)', 'ta.sma(series, length)', 'ta.rsi(series, length)', 'ta.crossover(a, b)', 'ta.vwap(close, vol)']);
    } else if (val.endsWith('strategy.')) {
      setSuggestions(['strategy.buy(size, stop_loss, take_profit)', 'strategy.sell(size)', 'strategy.close_all()', 'strategy.reverse()']);
    } else {
      setSuggestions([]);
    }
  };

  const lineNumbers = code.split('\n').map((_, i) => i + 1).join('\n');

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }}>
      <div style={{
        width: 1000, height: 640, backgroundColor: '#090d16', border: '1px solid #1e293b',
        borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#e2e8f0',
        fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px',
          backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b'
        }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 8 }}>
            💻 QUANTUM SCRIPT STUDIO & STRATEGY RUNTIME (v2.7)
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 16, cursor: 'pointer', fontWeight: 900 }}>✕</button>
        </div>

        {/* Top Navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px',
          backgroundColor: '#111827', borderBottom: '1px solid #1e293b'
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { id: 'editor', label: 'Code Editor' },
              { id: 'indicators', label: 'Indicator Library' },
              { id: 'strategies', label: 'Strategy Library' },
              { id: 'templates', label: 'Official Templates' },
              { id: 'marketplace', label: 'Script Marketplace' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                style={{
                  padding: '4px 9px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                  backgroundColor: activeTab === t.id ? '#f59e0b' : '#1e293b',
                  color: activeTab === t.id ? '#0f172a' : '#cbd5e1'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* AI Copilot Bar */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="🤖 Ask AI Copilot to write/fix script..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              style={{ width: 250, padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', fontSize: 10 }}
            />
            <button onClick={handleAIGenerate} disabled={aiLoading} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 800, cursor: 'pointer', fontSize: 10 }}>
              {aiLoading ? 'Generating...' : 'AI Generate'}
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <ScriptExplorer
            scripts={scripts}
            activeScriptId={activeScriptId}
            onSelectScript={handleSelectScript}
            onCreateNew={handleCreateNew}
          />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {activeTab === 'editor' && (
              <>
                {/* Editor Area */}
                <div style={{ flex: 1, display: 'flex', backgroundColor: '#090d16', overflow: 'hidden' }}>
                  {/* Line Numbers */}
                  <div style={{
                    width: 36, backgroundColor: '#0f172a', borderRight: '1px solid #1e293b',
                    color: '#64748b', textAlign: 'right', padding: '10px 6px', fontFamily: 'monospace', fontSize: 11, selectUser: 'none'
                  }}>
                    <pre style={{ margin: 0, fontFamily: 'monospace' }}>{lineNumbers}</pre>
                  </div>

                  {/* Code TextArea */}
                  <textarea
                    value={code}
                    onChange={handleCodeChange}
                    style={{
                      flex: 1, backgroundColor: '#090d16', color: '#38bdf8', border: 'none',
                      outline: 'none', padding: 10, fontFamily: 'Consolas, Monaco, monospace', fontSize: 12, lineHeight: '1.5', resize: 'none'
                    }}
                  />

                  {/* Autocomplete Popup */}
                  <Autocomplete suggestions={suggestions} onSelect={(item) => {
                    setCode(prev => prev + item.split('(')[0] + '()');
                    setSuggestions([]);
                  }} />
                </div>

                {/* Bottom Console */}
                <div style={{ height: 160 }}>
                  <CompilerConsole
                    compileResult={compileResult}
                    execResult={execResult}
                    onCompile={handleCompile}
                    onRun={handleRun}
                  />
                </div>
              </>
            )}

            {activeTab === 'indicators' && <div style={{ padding: 16 }}><IndicatorLibrary scripts={scripts} onSelect={(s) => handleSelectScript(s.id)} /></div>}
            {activeTab === 'strategies' && <div style={{ padding: 16 }}><StrategyLibrary scripts={scripts} onSelect={(s) => handleSelectScript(s.id)} /></div>}
            {activeTab === 'templates' && <div style={{ padding: 16 }}><TemplateBrowser onSelectTemplate={(tpl) => handleSelectScript(tpl.id)} /></div>}
            {activeTab === 'marketplace' && <div style={{ padding: 16 }}><Marketplace onInstall={(id) => handleSelectScript(id)} /></div>}
          </div>
        </div>
      </div>
    </div>
  );
};
