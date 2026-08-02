# Quantum Platform — One-Click Development Launcher Guide

**One-Click Launcher Version:** `v1.0`  
**Supported Platforms:** Windows, macOS, Linux

---

## 1. Quick Start

To launch the complete Quantum Platform (FastAPI Backend + Vite Frontend + Network Auto-Detection + Health Checks + Mobile-Ready Access) with a single command:

```bash
npm run quantum
```

Or run the platform native launcher scripts:

### On Windows:
```cmd
start_quantum.bat
```

### On macOS / Linux:
```bash
chmod +x start_quantum.sh
./start_quantum.sh
```

---

## 2. What the Launcher Does Automatically

1. **Auto-Detects Local LAN IP:** Automatically queries the active network IP (e.g. `192.168.1.4`).
2. **Launches FastAPI Backend:** Binds to `0.0.0.0:8000` with hot-reloading enabled.
3. **Performs Backend Health Check:** Polls `http://localhost:8000/health` until `200 OK` confirmation.
4. **Launches Vite Frontend:** Binds to `0.0.0.0:5173` with LAN accessibility.
5. **Performs Frontend Health Check:** Polls `http://localhost:5173` until `200 OK` confirmation.
6. **Configures Mobile API/WS Resolution:** `config.ts` dynamically resolves `http://192.168.x.x:8000` and `ws://192.168.x.x:8000/ws` for mobile clients without hardcoded `localhost` issues.
7. **Displays Telemetry Banner & Opens Browser:** Displays Desktop URL, Mobile URL, Backend URL, API Docs URL, and opens `http://localhost:5173`.
8. **Handles Graceful Shutdown:** `CTRL+C` cleanly terminates all background processes and frees ports `8000` and `5173`.

---

## 3. Telemetry Banner Output

```
======================================================================
 🚀 QUANTUM PLATFORM — ONE-CLICK DEVELOPMENT LAUNCHER (v1.0)
======================================================================
 [+] Detected LAN IP : 192.168.1.4
 [+] Workspace Root  : D:\Trading07
======================================================================

 [1/4] Starting FastAPI Backend (0.0.0.0:8000)...
       Waiting for backend health check at http://localhost:8000/health... HEALTHY! ✅

 [2/4] Starting Vite Frontend (0.0.0.0:5173)...
       Waiting for frontend health check at http://localhost:5173... HEALTHY! ✅

======================================================================
 🎉 QUANTUM PLATFORM IS FULLY OPERATIONAL & READY FOR DEV!
======================================================================
 💻 Desktop Terminal : http://localhost:5173
 📱 Mobile Terminal  : http://192.168.1.4:5173
 ⚙️ Backend API      : http://192.168.1.4:8000
 📑 Interactive Docs : http://192.168.1.4:8000/docs
======================================================================
 [!] Press CTRL+C at any time to gracefully shutdown all services.
======================================================================
```

---

## 4. Mobile Access (Android / iPhone)

1. Connect your Android or iPhone device to the **same Wi-Fi network** as your development PC.
2. Open Chrome or Safari on your phone.
3. Enter the **Mobile Terminal URL** displayed in the launcher console (e.g. `http://192.168.1.4:5173`).
4. The Quantum Mobile Pro Super App will load immediately with live data feeds and one-tap order execution!

---

## 5. Troubleshooting & Prerequisites

- **Python 3.10+** and **Node.js 18+** are required.
- If port `8000` or `5173` is already in use, the launcher will warn and terminate existing processes during shutdown.
- Ensure your Wi-Fi network profile is set to **Private Network** on Windows to allow local port 5173/8000 traffic.
