# Quantum Terminal — Static Security Audit Report

## 1. Executive Summary
A static security code audit of the Quantum Terminal repository (`/src`, `/backend`) was conducted to evaluate authentication safety, secrets handling, input sanitization, sub-process execution risks, and API endpoint security.

---

## 2. Findings Summary by Severity

### A. CRITICAL Findings
- **None Identified**: No hardcoded production credentials, unencrypted private keys, or SQL injection vulnerabilities were detected during static audit.

### B. HIGH Findings
- **Hardcoded Default JWT Secret Key**:
  - *Location*: `backend/app/core/config.py` & `backend/.env.example` (`JWT_SECRET=supersecretkey`).
  - *Risk*: If deployed to production without overriding `JWT_SECRET`, JWT tokens could be forged.
  - *Remediation*: Ensure `JWT_SECRET` is set to a secure, cryptographically random secret string in production environment variables.

### C. MEDIUM Findings
- **Simulated Order Safeguard Enforcer**:
  - *Location*: `backend/app/services/trading_engine.py`.
  - *Risk*: Ensure live order routing (`ENABLE_LIVE_ORDER_ROUTING`) cannot be accidentally enabled without valid broker credentials.
  - *Remediation*: Default configuration explicitly sets `DEMO_MODE=true` and `ENABLE_LIVE_ORDER_ROUTING=false`.

### D. LOW Findings
- **Script Studio Expression Evaluation**:
  - *Location*: `src/components/ScriptStudio/ScriptEditor.tsx`.
  - *Risk*: Client-side script evaluation of user-authored indicator mathematical expressions.
  - *Remediation*: Script execution is restricted strictly to local client-side Web Worker threads and sandbox memory.

### E. INFO / Static Analysis
- **CORS Configuration**: CORS middleware in `backend/app/main.py` is configured for local development (`http://localhost:5173`). Update `allow_origins` array prior to production deployment.
- **SQL Injection Safeguard**: Database queries utilize SQLAlchemy 2.0 ORM parameterization across all endpoints, preventing SQL injection vulnerabilities.
