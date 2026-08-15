import React, { useState, useEffect, useMemo } from 'react';
import { useMarketStore } from '../store/marketStore';
import { useMarketPriceStore } from '../store/marketPriceStore';
import { useAppStore } from '../store/appStore';
import { MarketSessionService } from '../services/marketSessionService';

const barStyle: React.CSSProperties = {
  height: '24px',
  background: '#0d1322', // Panel background
  borderTop: '1px solid #1b2235', // Border color
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 12px',
  fontSize: '11px',
  fontFamily: 'var(--font-sans)',
  color: 'var(--text-secondary)',
  zIndex: 100,
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  backgroundColor: color,
  display: 'inline-block',
});

const StatusBar: React.FC = () => {
  const connectionStatus = useMarketStore((s) => s.connectionStatus);
  const realMarketConnectionStatus = useMarketStore((s) => s.realMarketConnectionStatus);
  const feedSource = useMarketStore((s) => s.feedSource);
  const fallbackSource = useMarketStore((s) => s.fallbackSource);
  const lostPackets = useMarketStore((s) => s.lostPackets);
  const connectionQuality = useMarketStore((s) => s.connectionQuality);
  const latency = useMarketStore((s) => s.latency);
  const packetsSent = useMarketStore((s) => s.packetsSent);
  const packetsReceived = useMarketStore((s) => s.packetsReceived);
  const selectedInstrument = useAppStore((s) => s.selectedInstrument);
  const selectedSymbol = selectedInstrument?.symbol;
  const priceInfo = useMarketPriceStore((s) => selectedSymbol ? s.prices[selectedSymbol.toUpperCase()] : undefined);

  const lastTickTime = useMemo(() => {
    if (!priceInfo) return 'N/A';
    const date = new Date(priceInfo.timestamp);
    return date.toTimeString().split(' ')[0];
  }, [priceInfo]);

  const connectionDetails = useMemo(() => {
    const sym = selectedInstrument?.symbol?.toUpperCase();
    const isRealMarket = sym === 'XAUUSD' || sym === 'XAGUSD';
    const status = isRealMarket ? realMarketConnectionStatus : connectionStatus;
    
    switch (status) {
      case 'connected':
        return { text: 'Live', color: '#00c076', emoji: '🟢' };
      case 'connecting':
        return { text: 'Connecting', color: '#f0b90b', emoji: '🟡' };
      case 'reconnecting':
        return { text: 'Reconnecting', color: '#f39800', emoji: '🟠' };
      case 'disconnected':
      default:
        return { text: 'Offline', color: '#ff4d57', emoji: '🔴' };
    }
  }, [connectionStatus, realMarketConnectionStatus, selectedInstrument]);

  // Stats state
  const [utcTime, setUtcTime] = useState('');
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState('32.4 MB');

  // Time and dynamic stats update
  useEffect(() => {
    // 1. Time
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
      setUtcTime(timeStr);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // 2. FPS Simulation
    let lastTime = performance.now();
    let frames = 0;
    let fpsIntervalId: any;
    
    const calcFps = () => {
      const now = performance.now();
      frames++;
      if (now > lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      fpsIntervalId = requestAnimationFrame(calcFps);
    };
    fpsIntervalId = requestAnimationFrame(calcFps);

    // 3. Memory updates
    const statsInterval = setInterval(() => {
      const perf = (performance as any).memory;
      if (perf) {
        const mb = (perf.usedJSHeapSize / (1024 * 1024)).toFixed(1);
        setMemory(`${mb} MB`);
      } else {
        const mockMb = (30 + Math.random() * 5).toFixed(1);
        setMemory(`${mockMb} MB`);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(fpsIntervalId);
      clearInterval(statsInterval);
    };
  }, [connectionStatus]);

  // Determine current Session based on hour
  const session = useMemo(() => {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return 'Asian';
    if (hour >= 8 && hour < 16) return 'London';
    return 'New York';
  }, [utcTime]);

  const isConnected = connectionStatus === 'connected';
  const connectionColor = isConnected ? '#00c076' : '#ff4d57';

  // Market status and countdown state
  const [marketStatus, setMarketStatus] = useState<'OPEN' | 'CLOSED' | 'MAINTENANCE'>('OPEN');
  const [marketCountdown, setMarketCountdown] = useState('');

  useEffect(() => {
    if (!selectedSymbol) {
      setMarketStatus('OPEN');
      setMarketCountdown('');
      return;
    }
    const updateMarketSessionStatus = () => {
      const status = MarketSessionService.marketStatus(selectedSymbol);
      setMarketStatus(status);
      
      if (status === 'OPEN') {
        const nextCl = MarketSessionService.nextClose(selectedSymbol);
        if (nextCl) {
          const diff = nextCl.getTime() - Date.now();
          if (diff > 0) {
            const s = Math.floor(diff / 1000) % 60;
            const m = Math.floor(diff / 60000) % 60;
            const h = Math.floor(diff / 3600000) % 24;
            const d = Math.floor(diff / 86400000);
            const timeStr = (d > 0 ? `${d}d ` : '') + `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            setMarketCountdown(`Closes in ${timeStr}`);
          } else {
            setMarketCountdown('');
          }
        } else {
          setMarketCountdown(''); // 24/7 (Crypto)
        }
      } else {
        const nextOp = MarketSessionService.nextOpen(selectedSymbol);
        if (nextOp) {
          const diff = nextOp.getTime() - Date.now();
          if (diff > 0) {
            const s = Math.floor(diff / 1000) % 60;
            const m = Math.floor(diff / 60000) % 60;
            const h = Math.floor(diff / 3600000) % 24;
            const d = Math.floor(diff / 86400000);
            const timeStr = (d > 0 ? `${d}d ` : '') + `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            setMarketCountdown(`Opens in ${timeStr}`);
          } else {
            setMarketCountdown('Opening...');
          }
        } else {
          setMarketCountdown('Closed');
        }
      }
    };
    updateMarketSessionStatus();
    const interval = setInterval(updateMarketSessionStatus, 1000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // Mock spread in pips depending on symbol
  const spreadText = useMemo(() => {
    if (!selectedInstrument) return 'Spread: N/A';
    const sym = selectedInstrument.symbol;
    if (sym.includes('USDJPY')) return 'Spread: 1.4 pips';
    if (sym.includes('EURUSD')) return 'Spread: 0.8 pips';
    if (sym.includes('GBPUSD')) return 'Spread: 1.1 pips';
    if (sym.includes('BTC')) return 'Spread: $15.50';
    if (sym.includes('ETH')) return 'Spread: $0.85';
    if (sym.includes('XAU')) return 'Spread: $0.25';
    return 'Spread: 1.2 pips';
  }, [selectedInstrument]);

  return (
    <div style={barStyle}>
      <div style={sectionStyle}>
        {/* Connection Status Widget */}
        <div style={itemStyle}>
          <span style={{ color: connectionDetails.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span>{connectionDetails.emoji}</span>
            <span>{connectionDetails.text}</span>
          </span>
        </div>

        {/* WebSocket Status */}
        <div style={itemStyle}>
          <span>WS:</span>
          <strong style={{ color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            {selectedInstrument?.symbol?.toUpperCase() === 'XAUUSD' || selectedInstrument?.symbol?.toUpperCase() === 'XAGUSD'
              ? realMarketConnectionStatus
              : connectionStatus}
          </strong>
        </div>

        {/* Feed Info */}
        <div style={itemStyle}>
          <span>Source:</span>
          <strong style={{ color: 'var(--text-primary)' }}>{feedSource || 'N/A'}</strong>
        </div>

        {/* Last Tick Time */}
        <div style={itemStyle}>
          <span>Last Tick:</span>
          <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{lastTickTime}</strong>
        </div>

        {/* Current Symbol / Spread */}
        {selectedInstrument && (
          <>
            <div style={{ ...itemStyle, color: 'var(--text-primary)', fontWeight: 700 }}>
              {selectedInstrument.symbol}
            </div>
            <div style={itemStyle}>{spreadText}</div>
          </>
        )}
      </div>

      <div style={sectionStyle}>
        {/* Latency */}
        <div style={itemStyle}>
          <span>Latency:</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {isConnected ? `${latency} ms` : 'N/A'}
          </span>
        </div>

        {/* FPS */}
        <div style={itemStyle}>
          <span>FPS:</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {fps}
          </span>
        </div>

        {/* Memory */}
        <div style={itemStyle}>
          <span>RAM:</span>
          <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {memory}
          </span>
        </div>

        {/* Trading Session */}
        <div style={itemStyle}>
          <span>Session:</span>
          <strong style={{ color: 'var(--accent)' }}>{session}</strong>
        </div>

        {/* Market Status */}
        <div style={itemStyle}>
          <span>Market:</span>
          <span style={dotStyle(marketStatus === 'OPEN' ? '#00c076' : marketStatus === 'MAINTENANCE' ? '#f39800' : '#ff4d57')} />
          <span style={{ 
            color: marketStatus === 'OPEN' ? '#00c076' : marketStatus === 'MAINTENANCE' ? '#f39800' : '#ff4d57', 
            fontWeight: 600 
          }}>
            {marketStatus} {marketCountdown ? `(${marketCountdown})` : ''}
          </span>
        </div>

        {/* UTC Time */}
        <div style={{ ...itemStyle, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
          {utcTime}
        </div>
      </div>
    </div>
  );
};

export default React.memo(StatusBar);
