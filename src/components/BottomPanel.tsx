// src/components/BottomPanel.tsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useAppStore } from '../store/appStore';
import './BottomPanel.css';

// Lazy load heavy panels
const PositionsPanel = lazy(() => import('./PositionsPanel'));
const OrdersPanel = lazy(() => import('./OrdersPanel'));
const TradeHistoryPanel = lazy(() => import('./TradeHistoryPanel'));
const EconomicCalendar = lazy(() => import('./EconomicCalendar'));
const NewsPanel = lazy(() => import('./NewsPanel'));
const SentimentPanel = lazy(() => import('./SentimentPanel'));
const AlertsPanel = lazy(() => import('./AlertsPanel'));
const HeatmapPanel = lazy(() => import('./HeatmapPanel'));
const StrategyTesterPanel = lazy(() => import('./StrategyTesterPanel'));
const ReplayPanel = lazy(() => import('./ReplayPanel'));
const PerformancePanel = lazy(() => import('./PerformancePanel'));
const StatisticsPanel = lazy(() => import('./StatisticsPanel'));

// Phase 11 Portfolio Analytics panels
const DrawdownPanel = lazy(() => import('./DrawdownPanel'));
const RiskMetricsPanel = lazy(() => import('./RiskMetricsPanel'));
const SymbolAnalyticsPanel = lazy(() => import('./SymbolAnalyticsPanel'));

// Phase 12 Trade Journal & Coach
const TradeJournalPanel = lazy(() => import('./TradeJournalPanel'));

// Phase 14 AI Dashboard
const AIInsightsDashboard = lazy(() => import('./AIInsightsDashboard'));
const AISignalPanel = lazy(() => import('./AISignalPanel'));

// Phase 15 Institutional additions
const TradeExecutionLogPanel = lazy(() => import('./TradeExecutionLogPanel'));
const AccountAnalyticsPanel = lazy(() => import('./AccountAnalyticsPanel'));
const SessionPerformancePanel = lazy(() => import('./SessionPerformancePanel'));
const PortfolioAnalyzerPanel = lazy(() => import('./PortfolioAnalyzerPanel'));

// Real Data Infrastructure & Level II + Options Chain & AI Copilot additions
const DOMPanel = lazy(() => import('./DOMPanel'));
const OptionsPanel = lazy(() => import('./OptionsPanel'));
const AICopilotPanel = lazy(() => import('./AICopilotPanel'));

// Phase 17 additions
const BrokerPanel = lazy(() => import('./BrokerPanel'));
const CopyTradingPanel = lazy(() => import('./CopyTradingPanel'));
const PortfolioOptimizerPanel = lazy(() => import('./PortfolioOptimizerPanel'));
const MLAnalyticsPanel = lazy(() => import('./MLAnalyticsPanel'));
const StrategyMarketplacePanel = lazy(() => import('./StrategyMarketplacePanel'));
const FIXProtocolPanel = lazy(() => import('./FIXProtocolPanel'));
const ReportGeneratorPanel = lazy(() => import('./ReportGeneratorPanel'));

// Phase 18 additions
const QuantResearchPanel = lazy(() => import('./QuantResearchPanel'));
const RiskDeskPanel = lazy(() => import('./RiskDeskPanel'));
const AIResearchAssistantPanel = lazy(() => import('./AIResearchAssistantPanel'));
const TradePlaybooksPanel = lazy(() => import('./TradePlaybooksPanel'));
const MarketScannerPanel = lazy(() => import('./MarketScannerPanel'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));
const ScreenerPanel = lazy(() => import('./ScreenerPanel'));
const FuturesPanel = lazy(() => import('./FuturesPanel'));
const MicrostructurePanel = lazy(() => import('./MicrostructurePanel'));
const AIMarketAnalystPanel = lazy(() => import('./AIMarketAnalystPanel'));

type Tab = 
  | 'positions' 
  | 'orders' 
  | 'history' 
  | 'executionlog'
  | 'dom'
  | 'broker'
  | 'copytrading'
  | 'performance' 
  | 'statistics' 
  | 'portfolio'
  | 'drawdown'
  | 'risk'
  | 'accountanalytics'
  | 'portfoliooptimizer'
  | 'mlanalytics'
  | 'quantresearch'
  | 'riskdesk'
  | 'calendar' 
  | 'news' 
  | 'sentiment' 
  | 'sessions'
  | 'heatmap'
  | 'options'
  | 'journal'
  | 'aiinsights'
  | 'aiwatchlist'
  | 'aicopilot'
  | 'aiassistant'
  | 'playbooks'
  | 'strategytester'
  | 'replay'
  | 'alerts'
  | 'symbols'
  | 'strategymarketplace'
  | 'fixprotocol'
  | 'reportgenerator'
  | 'settings'
  | 'screener'
  | 'futures'
  | 'microstructure'
  | 'aimarketanalyst'
  | 'scanner';

const categories = {
  TRADING: ['positions', 'orders', 'history', 'executionlog', 'dom', 'broker', 'copytrading'],
  ANALYTICS: ['performance', 'statistics', 'portfolio', 'drawdown', 'risk', 'accountanalytics', 'portfoliooptimizer', 'mlanalytics', 'quantresearch', 'riskdesk', 'futures'],
  MARKET: ['calendar', 'news', 'sentiment', 'sessions', 'heatmap', 'options', 'screener', 'microstructure', 'scanner'],
  AI: ['journal', 'aiinsights', 'aiwatchlist', 'aicopilot', 'aiassistant', 'aimarketanalyst', 'playbooks'],
  TOOLS: ['strategytester', 'replay', 'alerts', 'symbols', 'strategymarketplace', 'fixprotocol', 'reportgenerator', 'settings']
} as const;

const BottomPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    try {
      const saved = localStorage.getItem('bottom-panel-active-tab');
      if (saved) return saved as Tab;
    } catch {}
    return 'positions';
  });

  const [activeCategory, setActiveCategory] = useState<keyof typeof categories>('TRADING');

  const mode = useAppStore((s) => s.settings.mode);

  useEffect(() => {
    localStorage.setItem('bottom-panel-active-tab', activeTab);
  }, [activeTab]);

  // Sync category on tab change (handles external navigation/command palette)
  useEffect(() => {
    const cat = Object.keys(categories).find(key => 
      (categories[key as keyof typeof categories] as readonly string[]).includes(activeTab)
    );
    if (cat) {
      setActiveCategory(cat as keyof typeof categories);
    }
  }, [activeTab]);

  // Command palette navigation listener
  useEffect(() => {
    const handleNav = (e: Event) => {
      const tabKey = (e as CustomEvent).detail as Tab;
      setActiveTab(tabKey);
    };
    window.addEventListener('navigate-tab', handleNav);
    return () => window.removeEventListener('navigate-tab', handleNav);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'positions':
        return <PositionsPanel />;
      case 'orders':
        return <OrdersPanel />;
      case 'history':
        return <TradeHistoryPanel />;
      case 'executionlog':
        return <TradeExecutionLogPanel />;
      case 'dom':
        return <DOMPanel />;
      case 'broker':
        return <BrokerPanel />;
      case 'copytrading':
        return <CopyTradingPanel />;
      case 'performance':
        return <PerformancePanel />;
      case 'statistics':
        return <StatisticsPanel />;
      case 'portfolio':
        return <PortfolioAnalyzerPanel />;
      case 'drawdown':
        return <DrawdownPanel />;
      case 'risk':
        return <RiskMetricsPanel />;
      case 'accountanalytics':
        return <AccountAnalyticsPanel />;
      case 'portfoliooptimizer':
        return <PortfolioOptimizerPanel />;
      case 'mlanalytics':
        return <MLAnalyticsPanel />;
      case 'quantresearch':
        return <QuantResearchPanel />;
      case 'riskdesk':
        return <RiskDeskPanel />;
      case 'futures':
        return <FuturesPanel />;
      case 'calendar':
        return <EconomicCalendar />;
      case 'news':
        return <NewsPanel />;
      case 'sentiment':
        return <SentimentPanel />;
      case 'sessions':
        return <SessionPerformancePanel />;
      case 'heatmap':
        return <HeatmapPanel />;
      case 'options':
        return <OptionsPanel />;
      case 'screener':
        return <ScreenerPanel />;
      case 'microstructure':
        return <MicrostructurePanel />;
      case 'scanner':
        return <MarketScannerPanel />;
      case 'journal':
        return <TradeJournalPanel />;
      case 'aiinsights':
        return <AIInsightsDashboard />;
      case 'aiwatchlist':
        return <AISignalPanel />;
      case 'aicopilot':
        return <AICopilotPanel />;
      case 'aiassistant':
        return <AIResearchAssistantPanel />;
      case 'aimarketanalyst':
        return <AIMarketAnalystPanel />;
      case 'playbooks':
        return <TradePlaybooksPanel />;
      case 'strategytester':
        return <StrategyTesterPanel />;
      case 'replay':
        return <ReplayPanel />;
      case 'alerts':
        return <AlertsPanel />;
      case 'symbols':
        return <SymbolAnalyticsPanel />;
      case 'strategymarketplace':
        return <StrategyMarketplacePanel />;
      case 'fixprotocol':
        return <FIXProtocolPanel />;
      case 'reportgenerator':
        return <ReportGeneratorPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  const getTabLabel = (key: Tab) => {
    switch (key) {
      case 'positions': return 'Positions';
      case 'orders': return 'Orders';
      case 'history': return 'History';
      case 'executionlog': return 'Execution Log';
      case 'dom': return 'DOM Ladder';
      case 'broker': return 'Broker Manager';
      case 'copytrading': return 'Copy Trading';
      case 'performance': return 'Performance';
      case 'statistics': return 'Statistics';
      case 'portfolio': return 'Portfolio';
      case 'drawdown': return 'Drawdown';
      case 'risk': return 'Risk';
      case 'accountanalytics': return 'Account Analytics';
      case 'portfoliooptimizer': return 'Portfolio Optimizer';
      case 'mlanalytics': return 'ML Analytics';
      case 'quantresearch': return 'Quant Research';
      case 'riskdesk': return 'Risk Desk';
      case 'futures': return 'Futures Analytics';
      case 'calendar': return 'Calendar';
      case 'news': return 'News';
      case 'sentiment': return 'Sentiment';
      case 'sessions': return 'Sessions';
      case 'heatmap': return 'Heatmap';
      case 'options': return 'Options Chain';
      case 'screener': return 'Screener';
      case 'microstructure': return 'Microstructure';
      case 'scanner': return 'Market Scanner';
      case 'journal': return 'Journal';
      case 'aiinsights': return 'AI Insights';
      case 'aiwatchlist': return 'AI Watchlist';
      case 'aicopilot': return 'AI Copilot';
      case 'aiassistant': return 'AI Assistant';
      case 'aimarketanalyst': return 'AI Market Analyst';
      case 'playbooks': return 'Playbooks';
      case 'strategytester': return 'Strategy Tester';
      case 'replay': return 'Replay';
      case 'alerts': return 'Alerts';
      case 'symbols': return 'Symbols';
      case 'strategymarketplace': return 'Strategy Marketplace';
      case 'fixprotocol': return 'FIX Protocol';
      case 'reportgenerator': return 'Report Generator';
      case 'settings': return '⚙ Settings';
      default: return key;
    }
  };

  return (
    <div className={`bottom-panel ${mode}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#0d1322' }}>
      {/* Category header bar */}
      <div style={{
        display: 'flex',
        background: '#070b14',
        borderBottom: '1px solid #1b2235',
        padding: '2px 8px',
        gap: '16px',
        alignItems: 'center',
        flexShrink: 0
      }}>
        {Object.keys(categories).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat as keyof typeof categories);
              setActiveTab(categories[cat as keyof typeof categories][0] as Tab);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 4px',
              color: activeCategory === cat ? '#ffffff' : '#8e8e93',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderBottom: activeCategory === cat ? '2px solid #d4af37' : '2px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Sub-tabs toolbar */}
      <div className="tab-bar" style={{
        display: 'flex',
        background: '#0d1322',
        borderBottom: '1px solid #1b2235',
        padding: '0 8px',
        gap: '4px',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {categories[activeCategory].map((tabKey) => (
          <button
            key={tabKey}
            className={activeTab === tabKey ? 'active' : ''}
            onClick={() => setActiveTab(tabKey as Tab)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tabKey ? '2px solid #d4af37' : '2px solid transparent',
              padding: '8px 12px',
              color: activeTab === tabKey ? '#d4af37' : '#8e8e93',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {getTabLabel(tabKey as Tab)}
          </button>
        ))}
      </div>

      {/* Content Frame */}
      <div className="tab-content" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<div className="panel empty">Loading...</div>}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );
};

export default React.memo(BottomPanel);
