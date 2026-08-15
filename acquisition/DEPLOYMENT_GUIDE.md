# Quantum Terminal — Deployment Guide

## 1. Local Development Deployment

### Prerequisites
- Node.js v18.0+ & npm
- Python v3.11+ & pip

### Frontend Setup
```bash
npm install
npm run dev
```

### Backend Setup
```bash
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 2. Production Deployment

### Building Static Frontend Bundle
```bash
npm run build
```
Generates production assets in `/dist`.

### Reverse Proxy Configuration (Nginx)
```nginx
server {
    listen 80;
    server_name trading.yourdomain.com;

    location / {
        root /var/www/quantum/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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

Launch containerized application stack using `docker-compose.yml`:
```bash
docker-compose up --build -d
```
