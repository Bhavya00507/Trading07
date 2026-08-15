# Quantum Terminal — Buyer FAQ

> **Frequently Asked Questions for Acquisition & Due-Diligence Teams**

---

### Q1: What exactly am I acquiring?
**A**: You are acquiring the complete, unencumbered source code repository for Quantum Terminal, including the React 18 / TypeScript frontend, Python FastAPI backend, database ORM models, Pytest suite (155 passing tests), build specifications, and technical documentation.

### Q2: Can I rebrand the application?
**A**: Yes. All branding, logos, color tokens, and app titles are centralized in `src/services/brandingService.ts` and `index.css`, allowing complete white-label rebranding.

### Q3: Can I connect my own brokerage or exchange APIs?
**A**: Yes. Quantum Terminal includes a provider interface pattern (`BrokerAdapter.ts`). Implement the adapter methods for your target API (Binance, IBKR, MT5, FIX gateway) to enable live execution.

### Q4: Is live trading enabled out-of-the-box?
**A**: Out-of-the-box, the application operates in **Demo Mode** using an in-memory paper matching engine (`trading_engine.py`). Real order routing requires configuring exchange API credentials and setting `ENABLE_LIVE_ORDER_ROUTING=true`.

### Q5: Is the market data real?
**A**: When connected online, the market data gateway streams live WebSocket price feeds. When offline, it automatically falls back to a realistic synthetic tick generator.

### Q6: What third-party licenses apply to the dependencies?
**A**: All third-party dependencies use permissive commercial licenses (MIT, BSD-3-Clause, Apache-2.0). There are zero GPL or copyleft licenses. TradingView Lightweight Charts is licensed under BSD-3-Clause.

### Q7: Can I deploy this on my own cloud infrastructure?
**A**: Yes. The repository includes Docker containers (`docker-compose.yml`), Nginx reverse proxy configs, PyInstaller build specs, and standalone Uvicorn ASGI server support.

### Q8: Can the mobile terminal be customized?
**A**: Yes. **Quantum Mobile Pro** (`MobileLayout.tsx`) is built with responsive CSS Modules and React components, allowing complete layout customization.

### Q9: Can this platform become a SaaS or prop firm workstation?
**A**: Yes. The architecture supports multi-tenant database models, user roles (RBAC), workspace synchronization, and risk limit rules suitable for SaaS or prop trading deployments.

### Q10: What remains to be built before live commercial launch?
**A**: Refer to [`PRODUCTION_GAP_ANALYSIS.md`](./PRODUCTION_GAP_ANALYSIS.md) for a detailed assessment of live broker integrations, commercial data feed licenses, and PostgreSQL database cluster setup.
