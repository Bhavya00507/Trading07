# Quantum Terminal — Empirical Performance Report

## Overview
This document records empirical performance metrics, build speeds, bundle asset sizes, and automated test execution results for **Quantum Terminal**.

---

## 1. Production Build Benchmarks

- **Build Command**: `npm run build`
- **Bundler**: Vite v5.4.21
- **Build Duration**: **1.86 seconds**
- **Exit Code**: `0` (Success)

### Bundle Output Breakdown (`/dist/assets/`)

| Asset Chunk | Size (Uncompressed) | Size (Gzip) | Content Description |
|---|---|---|---|
| `Chart-*.js` | 223.20 kB | 51.56 kB | TradingView Lightweight Charts & Canvas Overlay |
| `charts-vendor-*.js` | 153.67 kB | 49.95 kB | Canvas Chart Vendor Utilities |
| `react-vendor-*.js` | 141.80 kB | 45.43 kB | React 18 & React DOM Engine |
| `Header-*.js` | 79.65 kB | 17.74 kB | Header Bar & Presentation Modals |
| `index-*.js` | 61.87 kB | 18.46 kB | Core Application Entry Chunk |
| `MobileLayout-*.js` | 34.17 kB | 9.89 kB | Quantum Mobile Pro Layout & Touch Drawer |
| `OptionsPanel-*.js` | 30.96 kB | 6.20 kB | Options Desk Analytics & Greeks |
| `IndicatorLibrary-*.js` | 27.44 kB | 8.89 kB | Technical Indicator Selector Modal |
| `PortfolioSystem-*.js` | 26.99 kB | 6.84 kB | Portfolio Analytics & Risk Lab |

---

## 2. Backend Test Suite Metrics

- **Test Command**: `python -m pytest backend/tests --tb=short`
- **Framework**: Pytest 9.1.0 with `pytest-asyncio`
- **Total Test Count**: **155 items**
- **Pass Rate**: **100% (155 Passed, 0 Failed)**
- **Execution Duration**: **13.56 seconds**

### Test Module Breakdown

- `test_advanced_features.py`: 4 passed
- `test_ai_copilot_enterprise.py`: 4 passed
- `test_auth_rbac_api_keys.py`: 1 passed
- `test_autonomous_ai_v50.py`: 4 passed
- `test_candle_engine_v1.py`: 5 passed
- `test_chart_orders.py`: 13 passed
- `test_chart_trading.py`: 8 passed
- `test_cloud_workspace_sync_v31.py`: 4 passed
- `test_enterprise_developer_platform_v70.py`: 4 passed
- `test_global_financial_ecosystem_v80.py`: 5 passed
- `test_health.py`: 2 passed
- `test_hedge_fund_mam_v60.py`: 4 passed
- `test_institutional_scanner_v33.py`: 4 passed
- `test_journal.py`: 5 passed
- `test_market_data_gateway.py`: 4 passed
- `test_marketplace_v40.py`: 4 passed
- `test_mbo_engine.py`: 3 passed
- `test_mobile_companion_v32.py`: 4 passed
- `test_options_engine.py`: 11 passed
- `test_orderflow.py`: 7 passed
- `test_portfolio.py`: 6 passed
- `test_portfolio_risk_lab_v34.py`: 5 passed
- `test_quantum_os_v90.py`: 4 passed
- `test_replay.py`: 5 passed
- `test_replay_stress.py`: 2 passed
- `test_scanner.py`: 3 passed
- `test_script_engine.py`: 3 passed
- `test_smart_order_router.py`: 3 passed
- `test_strategy_builder.py`: 6 passed
- `test_trading_engine.py`: 7 passed
- `test_webhooks.py`: 1 passed
- `test_workspace_api.py`: 3 passed
- `test_workspace_performance.py`: 1 passed
- `test_workspace_restore.py`: 1 passed
- `test_workspace_sync.py`: 5 passed
