import React, { useState, useEffect } from 'react';

export const QuantumOSPanel: React.FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'bi' | 'tenants' | 'workflows' | 'agents'>('bi');
  const [newOrgName, setNewOrgName] = useState<string>('JPMorgan Quant Desk');

  const fetchDashboard = () => {
    fetch('/api/quantum-os/dashboard')
      .then(res => res.json())
      .then(d => setDashboard(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateTenant = async () => {
    try {
      const res = await fetch('/api/quantum-os/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_name: newOrgName, tier: 'ENTERPRISE_OS' })
      });
      if (res.ok) {
        alert(`🏢 Multi-Tenant Organization Created: ${newOrgName}`);
        fetchDashboard();
      }
    } catch {}
  };

  const handleTriggerWorkflow = async (workflowId: string) => {
    try {
      const res = await fetch('/api/quantum-os/workflows/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow_id: workflowId, payload: { event: 'TEST_TRIGGER' } })
      });
      if (res.ok) {
        alert('⚡ Visual Workflow Execution Pipeline Triggered!');
        fetchDashboard();
      }
    } catch {}
  };

  const handleRunAgentCollaboration = async () => {
    try {
      const res = await fetch('/api/quantum-os/ai-agents/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_description: 'Audit BTCUSDT orderflow execution risk & compliance limits' })
      });
      if (res.ok) {
        const d = await res.json();
        alert(`🤖 AI Agents Collaboration Verdict: ${d.verdict} (Consensus: ${d.consensus_score_pct}%)`);
        fetchDashboard();
      }
    } catch {}
  };

  if (!dashboard) return null;
  const bi = dashboard.executive_bi;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#090d16',
      color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, padding: 16, gap: 14, overflowY: 'auto'
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#0f172a', borderRadius: 8, border: '1px solid #1e293b' }}>
        <div>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
            🖥️ QUANTUMOS FINANCIAL OPERATING SYSTEM (v9.0)
          </span>
          <div style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
            Multi-Tenant Architecture | Visual Workflow Automation | Specialized AI Agents | Enterprise Data Lake & BI
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setActiveTab('bi')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'bi' ? '#38bdf8' : '#1e293b', color: activeTab === 'bi' ? '#0f172a' : '#cbd5e1' }}>📊 Executive BI</button>
          <button onClick={() => setActiveTab('tenants')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'tenants' ? '#10b981' : '#1e293b', color: activeTab === 'tenants' ? '#0f172a' : '#cbd5e1' }}>🏢 Tenants</button>
          <button onClick={() => setActiveTab('workflows')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'workflows' ? '#f59e0b' : '#1e293b', color: activeTab === 'workflows' ? '#0f172a' : '#cbd5e1' }}>⚡ Workflows</button>
          <button onClick={() => setActiveTab('agents')} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 10, backgroundColor: activeTab === 'agents' ? '#a78bfa' : '#1e293b', color: activeTab === 'agents' ? '#0f172a' : '#cbd5e1' }}>🤖 AI Agents</button>
        </div>
      </div>

      {activeTab === 'bi' && bi && (
        <>
          {/* BI Telemetry Banner Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>GLOBAL TRADING VOLUME</div>
              <div style={{ fontWeight: 900, color: '#10b981', fontSize: 16 }}>${(bi.global_trading_volume_usd / 1000000000).toFixed(2)}B</div>
            </div>
            <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>TOTAL AUM MANAGED</div>
              <div style={{ fontWeight: 900, color: '#38bdf8', fontSize: 16 }}>${(bi.total_aum_managed_usd / 1000000).toFixed(2)}M</div>
            </div>
            <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>ACTIVE TENANT ORGANIZATIONS</div>
              <div style={{ fontWeight: 900, color: '#f59e0b', fontSize: 16 }}>{bi.active_organizations} Orgs</div>
            </div>
            <div style={{ padding: 10, borderRadius: 6, backgroundColor: '#0f172a', border: '1px solid #1e293b' }}>
              <div style={{ color: '#94a3b8', fontSize: 9 }}>GPU CLUSTER UTILIZATION</div>
              <div style={{ fontWeight: 900, color: '#a78bfa', fontSize: 16 }}>{bi.gpu_cluster_utilization_pct}%</div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'tenants' && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#10b981', fontSize: 12 }}>🏢 MULTI-TENANT ENTERPRISE ORGANIZATIONS</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} style={{ padding: 4, borderRadius: 4, backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155' }} />
              <button onClick={handleCreateTenant} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#10b981', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>Create Tenant</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {Object.entries(dashboard.tenants || {}).map(([id, t]: [string, any]) => (
              <div key={id} style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: 12 }}>{t.org_name} ({id})</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Departments: {t.departments?.join(', ')}</div>
                <div style={{ color: '#38bdf8', fontSize: 9 }}>Users: {t.active_users} • Storage: {t.isolated_storage_gb} GB</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: 12 }}>⚡ VISUAL WORKFLOW AUTOMATION PIPELINES</span>
          {dashboard.workflows?.map((wf: any) => (
            <div key={wf.workflow_id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, backgroundColor: '#1e293b', borderRadius: 6, alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800 }}>{wf.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Trigger: {wf.trigger} ➔ Action: {wf.action}</div>
              </div>
              <button onClick={() => handleTriggerWorkflow(wf.workflow_id)} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>Execute Pipeline</button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'agents' && (
        <div style={{ padding: 12, borderRadius: 8, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 12 }}>🤖 SPECIALIZED ENTERPRISE AI AGENTS</span>
            <button onClick={handleRunAgentCollaboration} style={{ padding: '4px 10px', borderRadius: 4, border: 'none', backgroundColor: '#a78bfa', color: '#0f172a', fontWeight: 900, cursor: 'pointer', fontSize: 10 }}>Run Multi-Agent Audit</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {dashboard.ai_agents?.map((ag: any) => (
              <div key={ag.agent_id} style={{ padding: 10, backgroundColor: '#1e293b', borderRadius: 6 }}>
                <div style={{ fontWeight: 800, color: '#38bdf8' }}>{ag.name}</div>
                <div style={{ color: '#94a3b8', fontSize: 9 }}>Role: {ag.role} • Tasks Completed: {ag.tasks_completed}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
