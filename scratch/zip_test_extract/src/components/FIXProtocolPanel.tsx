import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/appStore';

interface FIXLog {
  id: string;
  time: string;
  direction: 'IN' | 'OUT';
  message: string;
  type: string; // Logon, Heartbeat, ExecutionReport, Reject, etc.
}

const INITIAL_LOGS: FIXLog[] = [
  { id: '1', time: '18:15:30', direction: 'OUT', message: '8=FIX.4.4|9=112|35=A|49=CLIENT_TERMINAL|56=BROKER_GATEWAY|34=1|52=20260623-12:45:30|98=0|108=30|10=142|', type: 'Logon' },
  { id: '2', time: '18:15:31', direction: 'IN', message: '8=FIX.4.4|9=98|35=A|49=BROKER_GATEWAY|56=CLIENT_TERMINAL|34=1|52=20260623-12:45:31|108=30|10=084|', type: 'Logon' },
  { id: '3', time: '18:16:01', direction: 'OUT', message: '8=FIX.4.4|9=76|35=0|49=CLIENT_TERMINAL|56=BROKER_GATEWAY|34=2|52=20260623-12:46:01|10=210|', type: 'Heartbeat' },
  { id: '4', time: '18:16:01', direction: 'IN', message: '8=FIX.4.4|9=76|35=0|49=BROKER_GATEWAY|56=CLIENT_TERMINAL|34=2|52=20260623-12:46:01|10=210|', type: 'Heartbeat' }
];

export const FIXProtocolPanel: React.FC = () => {
  const [logs, setLogs] = useState<FIXLog[]>(INITIAL_LOGS);
  const [sessionActive, setSessionActive] = useState(true);
  const [seqIn, setSeqIn] = useState(3);
  const [seqOut, setSeqOut] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualMsgType, setManualMsgType] = useState('D'); // D = New Order Single, 0 = Heartbeat, 2 = Resend Request
  const [rejectMode, setRejectMode] = useState(false); // If true, next message will trigger a reject

  const addToast = useAppStore((state) => state.addToast);

  // Heartbeat monitoring simulator
  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().substring(0, 8);
      
      setSeqOut((o) => o + 1);
      const outMsg: FIXLog = {
        id: Math.random().toString(),
        time: timeStr,
        direction: 'OUT',
        message: `8=FIX.4.4|9=76|35=0|49=CLIENT_TERMINAL|56=BROKER_GATEWAY|34=${seqOut}|52=${now.toISOString().replace(/[-:]/g, '')}|10=224|`,
        type: 'Heartbeat'
      };

      setTimeout(() => {
        setSeqIn((i) => i + 1);
        let inMsg: FIXLog;
        if (rejectMode) {
          inMsg = {
            id: Math.random().toString(),
            time: timeStr,
            direction: 'IN',
            message: `8=FIX.4.4|9=110|35=3|49=BROKER_GATEWAY|56=CLIENT_TERMINAL|34=${seqIn}|45=${seqOut}|371=35|373=1|58=Required tag missing|10=095|`,
            type: 'SessionReject'
          };
          addToast('error', '[FIX] Session Reject received: Tag missing.');
        } else {
          inMsg = {
            id: Math.random().toString(),
            time: timeStr,
            direction: 'IN',
            message: `8=FIX.4.4|9=76|35=0|49=BROKER_GATEWAY|56=CLIENT_TERMINAL|34=${seqIn}|52=${now.toISOString().replace(/[-:]/g, '')}|10=182|`,
            type: 'Heartbeat'
          };
        }
        setLogs((prev) => [inMsg, outMsg, ...prev.slice(0, 48)]);
      }, 350);

    }, 12000);

    return () => clearInterval(interval);
  }, [sessionActive, seqIn, seqOut, rejectMode, addToast]);

  const handleToggleSession = () => {
    if (sessionActive) {
      setSessionActive(false);
      addToast('info', 'FIX Session Logoff sent. Session terminated.');
    } else {
      setSessionActive(true);
      setSeqIn(1);
      setSeqOut(1);
      setLogs([]);
      addToast('success', 'FIX Session Logon initiated over SSL.');
    }
  };

  const handleSendManualMessage = () => {
    if (!sessionActive) {
      addToast('error', 'Cannot send message. FIX session is inactive.');
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);
    const dateTag = now.toISOString().replace(/[-:]/g, '').substring(0, 15);
    
    setSeqOut((o) => o + 1);
    let msgStr = '';
    let msgType = '';

    if (manualMsgType === 'D') {
      msgStr = `8=FIX.4.4|9=152|35=D|49=CLIENT_TERMINAL|56=BROKER_GATEWAY|34=${seqOut}|52=${dateTag}|11=CL_ORD_${Date.now()}|21=1|55=BTCUSDT|54=1|60=${dateTag}|38=0.1|40=2|44=65200|10=114|`;
      msgType = 'NewOrderSingle';
    } else if (manualMsgType === '0') {
      msgStr = `8=FIX.4.4|9=76|35=0|49=CLIENT_TERMINAL|56=BROKER_GATEWAY|34=${seqOut}|52=${dateTag}|10=224|`;
      msgType = 'Heartbeat';
    } else if (manualMsgType === '2') {
      msgStr = `8=FIX.4.4|9=94|35=2|49=CLIENT_TERMINAL|56=BROKER_GATEWAY|34=${seqOut}|52=${dateTag}|7=1|16=5|10=044|`;
      msgType = 'ResendRequest';
    }

    const outMsg: FIXLog = {
      id: Math.random().toString(),
      time: timeStr,
      direction: 'OUT',
      message: msgStr,
      type: msgType
    };

    setTimeout(() => {
      setSeqIn((i) => i + 1);
      let inMsg: FIXLog;
      if (rejectMode) {
        inMsg = {
          id: Math.random().toString(),
          time: timeStr,
          direction: 'IN',
          message: `8=FIX.4.4|9=122|35=j|49=BROKER_GATEWAY|56=CLIENT_TERMINAL|34=${seqIn}|380=2|379=INVALID_PRICE|58=Price exceeds exposure threshold limit|10=204|`,
          type: 'BusinessMessageReject'
        };
        addToast('error', '[FIX] Business Message Reject received: Price exceeds threshold.');
      } else {
        inMsg = {
          id: Math.random().toString(),
          time: timeStr,
          direction: 'IN',
          message: `8=FIX.4.4|9=140|35=8|49=BROKER_GATEWAY|56=CLIENT_TERMINAL|34=${seqIn}|52=${dateTag}|37=BRK_ID_552|11=CL_ORD_${Date.now()}|39=0|150=0|10=182|`,
          type: 'ExecutionReport'
        };
        addToast('success', '[FIX] Execution Report (New) received from Broker.');
      }
      setLogs((prev) => [inMsg, outMsg, ...prev.slice(0, 48)]);
    }, 400);
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    return logs.filter((log) => log.message.toLowerCase().includes(searchQuery.toLowerCase()) || log.type.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [logs, searchQuery]);

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', background: '#0d1322', fontFamily: 'var(--font-sans)', overflow: 'hidden', fontSize: '11px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1b2235', paddingBottom: '6px', flexShrink: 0 }}>
        <div>
          <strong style={{ fontSize: '14px', color: '#f5f5f7' }}>FIX Protocol Gateway (FIX 4.4)</strong>
          <span style={{ fontSize: '9px', display: 'block', color: '#8e8e93' }}>
            Session Monitor, Heartbeat logs, Reconnection Controls, and Business Message Reject handlers
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setRejectMode(!rejectMode)}
            style={{
              background: rejectMode ? '#ff4d57' : '#070b14',
              color: rejectMode ? '#070b14' : '#ff4d57',
              fontSize: '9px',
              fontWeight: 800,
              border: '1px solid #ff4d57',
              padding: '4px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            {rejectMode ? '🚨 FORCE REJECTS ON' : '🚨 SIMULATE REJECTS'}
          </button>
          <button
            onClick={handleToggleSession}
            style={{
              background: sessionActive ? '#ff4d57' : '#00c076',
              color: '#070b14',
              fontSize: '9px',
              fontWeight: 850,
              border: 'none',
              padding: '4px 10px',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            {sessionActive ? 'TERMINATE SESSION' : 'INITIATE SESSION'}
          </button>
        </div>
      </div>

      {/* Main split */}
      <div style={{ flex: 1, display: 'flex', gap: '12px', overflow: 'hidden' }}>
        
        {/* Left: FIX Audit Session logs */}
        <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ background: '#0d1322', padding: '6px 10px', borderBottom: '1px solid #1b2235', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#d4af37', textTransform: 'uppercase' }}>
              Raw Session Message Audit Log
            </span>
            <input
              type="text"
              placeholder="Search Tag / Message Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: '#0d1322',
                border: '1px solid #1b2235',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '3px',
                fontSize: '10px',
                outline: 'none',
                width: '180px'
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filteredLogs.map((log) => {
              const typeColor = log.type.includes('Reject') ? '#ff4d57' : log.type === 'ExecutionReport' ? '#00c076' : '#8e8e93';
              return (
                <div key={log.id} style={{ display: 'flex', gap: '6px', borderBottom: '1px dashed rgba(27,34,53,0.4)', paddingBottom: '3px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#8e8e93' }}>[{log.time}]</span>
                  <span style={{ color: log.direction === 'OUT' ? '#00c076' : '#58a6ff', fontWeight: 700, width: '40px', flexShrink: 0 }}>
                    {log.direction === 'OUT' ? '▶ OUT' : '◀ IN'}
                  </span>
                  <span style={{
                    color: typeColor,
                    fontWeight: 700,
                    fontSize: '8px',
                    border: `1px solid ${typeColor}30`,
                    padding: '0 3px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    width: '100px',
                    textAlign: 'center',
                    flexShrink: 0
                  }}>{log.type}</span>
                  <span style={{ color: '#f5f5f7', wordBreak: 'break-all' }}>{log.message}</span>
                </div>
              );
            })}
            {filteredLogs.length === 0 && (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8e8e93', textTransform: 'uppercase' }}>
                No matching messages found in this audit session.
              </div>
            )}
          </div>
        </div>

        {/* Right: Manual Generator & Session details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
          
          {/* Manual Generator */}
          <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <strong style={{ color: '#d4af37', textTransform: 'uppercase', fontSize: '10px' }}>FIX Message injector</strong>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={manualMsgType}
                onChange={(e) => setManualMsgType(e.target.value)}
                style={{
                  background: '#0d1322',
                  border: '1px solid #1b2235',
                  color: '#fff',
                  padding: '4px',
                  borderRadius: '3px',
                  flex: 1
                }}
              >
                <option value="D">New Order Single (35=D)</option>
                <option value="0">Heartbeat (35=0)</option>
                <option value="2">Resend Request (35=2)</option>
              </select>
              <button
                onClick={handleSendManualMessage}
                style={{
                  background: '#d4af37',
                  border: 'none',
                  color: '#070b14',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                SEND
              </button>
            </div>
          </div>

          {/* Session properties */}
          <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              FIX Session Details
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ color: '#8e8e93' }}>Session State</span>
              <strong style={{ color: sessionActive ? '#00c076' : '#ff4d57' }}>{sessionActive ? 'ACTIVE / SECURE' : 'INACTIVE'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ color: '#8e8e93' }}>Target Comp ID</span>
              <strong style={{ color: '#f5f5f7' }}>BROKER_GATEWAY</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ color: '#8e8e93' }}>Sender Comp ID</span>
              <strong style={{ color: '#f5f5f7' }}>CLIENT_TERMINAL</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ color: '#8e8e93' }}>Sequence (In/Out)</span>
              <strong style={{ color: '#f5f5f7', fontFamily: 'var(--font-mono)' }}>{seqIn} / {seqOut}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8e8e93' }}>Heartbeat Interval</span>
              <strong style={{ color: '#f5f5f7' }}>30 Seconds</strong>
            </div>
          </div>

          {/* Connection statistics */}
          <div style={{ background: '#070b14', border: '1px solid #1b2235', borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#d4af37', textTransform: 'uppercase', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              TCP/IP Transport Stats
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ color: '#8e8e93' }}>IP Address / Port</span>
              <strong style={{ color: '#f5f5f7' }}>184.22.109.112:7044</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1b2235', paddingBottom: '4px' }}>
              <span style={{ color: '#8e8e93' }}>Tunneling Protocol</span>
              <strong style={{ color: '#f5f5f7' }}>Stunnel TLS v1.3</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8e8e93' }}>Latency (RTT)</span>
              <strong style={{ color: '#00c076' }}>4.2 ms</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default FIXProtocolPanel;
