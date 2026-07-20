# Installation & Developer Setup Guide

This guide details the step-by-step installation instructions for setting up the **Trading Terminal** platform locally for development, Docker containers, and the Electron desktop application.

---

## 📋 Prerequisites

Before starting, ensure you have the following software installed:

*   **Node.js**: `v18.0.0` or higher (`v20+` recommended)
*   **Python**: `v3.11` or `v3.12`
*   **Git**: `v2.30+`
*   **PostgreSQL**: `v14+` (Optional for local SQLite dev mode)

---

## 🛠️ Step 1: Clone the Repository

```bash
git clone https://github.com/Bhavya00507/Trading07.git
cd Trading07
```

---

## ⚙️ Step 2: Backend Setup (FastAPI)

1.  **Navigate to the backend folder**:
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment**:
    *   **Windows**:
        ```bash
        python -m venv venv
        venv\Scripts\activate
        ```
    *   **macOS / Linux**:
        ```bash
        python3 -m venv venv
        source venv/bin/activate
        ```

3.  **Install Python dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables**:
    Create a `.env` file inside the `backend` directory (or use `.env.example`):
    ```env
    DATABASE_URL=sqlite+aiosqlite:///./test.db
    JWT_SECRET=super-secret-production-trading-core-key-2026
    JWT_ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=1440
    ```

5.  **Run the FastAPI Backend**:
    ```bash
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    *The API server will run at `http://127.0.0.1:8000` and Swagger docs at `http://127.0.0.1:8000/docs`.*

---

## 🌐 Step 3: Frontend Setup (React + Vite)

1.  **Return to the root directory**:
    ```bash
    cd ..
    ```

2.  **Install Node dependencies**:
    ```bash
    npm install
    ```

3.  **Run the Vite Development Server**:
    ```bash
    npm run dev
    ```
    *The application will launch at `http://localhost:5173`.*

4.  **Run Production Build & Preview**:
    ```bash
    npm run build
    npm run preview -- --host 0.0.0.0 --port 4173
    ```
    *The production build will be available at `http://localhost:4173`.*

---

## 💻 Step 4: Desktop Application Setup (Electron)

To run the desktop version using Electron:

1.  Ensure the FastAPI backend is running (Step 2).
2.  Start the Electron application:
    ```bash
    npm run electron:dev
    ```

To build a standalone Windows `.exe` installer:
```bash
npm run electron:build
```
*The installer package will be output to the `dist-desktop` directory.*

---

## 🐳 Step 5: Docker Container Deployment (Optional)

To build and run the backend using Docker:

```bash
docker build -t trading07-backend -f Dockerfile .
docker run -d -p 8000:8000 --name trading07-container trading07-backend
```
