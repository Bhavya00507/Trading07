# Quantum Terminal — Setup & Deployment Guide

## 1. Local Development Setup

### Prerequisites
- Node.js v18.0+ & npm
- Python v3.11+ & pip

### Frontend Setup
```bash
# Install NPM dependencies
npm install

# Start Vite dev server with hot reload
npm run dev
```
The frontend will launch at `http://localhost:5173`.

### Backend Setup
```bash
# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend development server
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
The backend API documentation (Swagger UI) is available at `http://127.0.0.1:8000/docs`.

---

## 2. Production Build

### Building Frontend Bundle
```bash
npm run build
```
This compiles optimized production static assets into `/dist`.

### Running Production Bundle via Nginx
An example Nginx configuration file is provided in `nginx.conf`:
```nginx
server {
    listen 80;
    server_name trading.yourdomain.com;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

---

## 3. Docker Deployment

A multi-stage `Dockerfile` and `docker-compose.yml` are provided in the repository.

To build and launch the containerized application:
```bash
docker-compose up --build -d
```
This launches the backend API container and static frontend server.
