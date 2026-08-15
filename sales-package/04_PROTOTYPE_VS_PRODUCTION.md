# QUANTUM TERMINAL — PROTOTYPE VS. PRODUCTION AUDIT

This document transparently outlines the boundary between the current verified software prototype and what an acquiring buyer must implement for commercial production operations.

---

## CAPABILITY COMPARISON TABLE

| Functional Area | Current Verified Prototype State | Required Buyer Action for Production |
|-----------------|---------------------------------|--------------------------------------|
| **Demo Trading** | WORKING out-of-the-box. Paper order matching against simulated liquidity. | Maintain as sandbox/demo feature for client onboarding. |
| **Real Broker Execution** | Pluggable broker handler hooks & FIX 4.4 code structures. | Connect live broker REST/FIX APIs (e.g. IBKR TWS, Binance Live, FIX Gateways). |
| **Crypto Market Data** | WORKING live streaming via Binance WebSocket API. | Maintain or acquire commercial crypto WebSocket feed license. |
| **FX & Equities Data** | SIMULATED fallback price tick generator. | Subscribe to institutional paid data feeds (Finnhub, TwelveData, Refinitiv). |
| **Options Analytics** | WORKING Call/Put chain matrix & Black-Scholes Greeks calculator. | Connect real options OPRA / exchange feed for live IV skew data. |
| **Smart Order Router** | SIMULATED Level-2 DOM ladder & multi-venue route matching. | Connect real liquidity provider feeds and smart order execution gateways. |
| **AI Analyst & Copilot** | SIMULATED technical heuristic signal algorithms. | Supply production OpenAI API key (OPENAI_API_KEY) or custom LLM endpoint. |
| **Database Storage** | WORKING SQLite database (test.db). | Configure production PostgreSQL / AWS RDS instance via DATABASE_URL. |
| **Authentication & RBAC** | WORKING JWT authentication and user registration endpoints. | Enable OAuth2/SSO, multi-factor authentication (MFA), and password reset services. |
| **Regulatory Compliance** | NOT INCLUDED. Prototype is non-regulated software. | Obtain required financial licenses (SEC, FINRA, FCA, ESMA) and AML/KYC vendor integrations. |
| **Infrastructure & Security** | Production build verified (npm run build). | Deploy to AWS/GCP Kubernetes with SSL/TLS termination, WAF, and DDoS mitigation. |
