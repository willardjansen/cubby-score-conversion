# CubbyScore.com - VPS Deployment Instructions

**Server:** 178.251.232.89 (mijn.host VPS)
**Domain:** cubbyscore.com
**Date:** 2026-01-20

---

## DNS Configuration (TransIP)

Before deploying, configure your DNS at TransIP:

1. Log in to TransIP control panel
2. Go to Domain management → cubbyscore.com → DNS
3. Add/update these records:

| Type | Name | Content | TTL |
|------|------|---------|-----|
| A | @ | 178.251.232.89 | 3600 |
| A | www | 178.251.232.89 | 3600 |

**Note:** DNS propagation can take up to 24 hours, but usually completes within 1-2 hours.

---

## Part 1: Server Preparation (One-time setup)

### 1.1 Install System Dependencies

```bash
# SSH into server
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89

# Install Python 3.11+ and pip
dnf install -y python3.11 python3.11-pip python3.11-devel

# Install Java 17 for Audiveris
dnf install -y java-17-openjdk java-17-openjdk-devel

# Install system libraries for image processing
dnf install -y poppler-utils tesseract ghostscript
dnf install -y libxml2-devel libxslt-devel

# Install Node.js (if not already installed)
dnf install -y nodejs npm

# Verify installations
python3.11 --version
java -version
node --version
```

### 1.2 Install Audiveris

```bash
# Download Audiveris (check for latest version at https://github.com/Audiveris/audiveris/releases)
cd /opt
wget https://github.com/Audiveris/audiveris/releases/download/5.3.1/Audiveris-5.3.1-linux-x86_64.zip
unzip Audiveris-5.3.1-linux-x86_64.zip
ln -s /opt/Audiveris-5.3.1/bin/Audiveris /usr/local/bin/audiveris

# Test Audiveris
audiveris -help
```

**Note:** If Audiveris package isn't available as zip, you may need to build from source:
```bash
git clone https://github.com/Audiveris/audiveris.git
cd audiveris
./gradlew build
ln -s /opt/audiveris/build/distributions/Audiveris/bin/Audiveris /usr/local/bin/audiveris
```

### 1.3 Create Application Directories

```bash
mkdir -p /var/www/cubbyscore-frontend
mkdir -p /var/www/cubbyscore-backend
mkdir -p /var/www/cubbyscore-backend/uploads
mkdir -p /var/www/cubbyscore-backend/outputs
```

---

## Part 2: Backend Deployment

### 2.1 Build and Upload Backend (from local machine)

```bash
# From your local cubby-score-conversion directory
cd /Users/willardjansen/dev/cubby-score-conversion/backend

# Upload backend files
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'uploads/*' \
  --exclude 'outputs/*' \
  --exclude '.env' \
  ./ root@178.251.232.89:/var/www/cubbyscore-backend/
```

### 2.2 Set Up Python Environment on VPS

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89

cd /var/www/cubbyscore-backend

# Create virtual environment
python3.11 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Install certifi for SSL (needed for homr model downloads)
pip install certifi
```

### 2.3 Apply homr Python 3.11+ Patch (if needed)

If using Python 3.11+ and homr, apply this patch:

```bash
# Find the autocrop.py file
AUTOCROP_FILE=$(find /var/www/cubbyscore-backend/venv -name "autocrop.py" -path "*/homr/*" 2>/dev/null)

if [ -n "$AUTOCROP_FILE" ]; then
  # Backup original
  cp "$AUTOCROP_FILE" "$AUTOCROP_FILE.bak"

  # Apply patch (line 16: change int(x[1]) to int(x[1][0]))
  sed -i 's/int(x\[1\])\[0\]/int(x[1][0])/g' "$AUTOCROP_FILE"
  echo "Patched: $AUTOCROP_FILE"
fi
```

### 2.4 Create Backend Environment File

```bash
cat > /var/www/cubbyscore-backend/.env << 'EOF'
# Audiveris path
AUDIVERIS_PATH=/usr/local/bin/audiveris

# Directories
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs

# Server settings
HOST=0.0.0.0
PORT=8001
EOF
```

### 2.5 Update Backend main.py for Linux Audiveris Path

The backend needs to know where Audiveris is installed. Check/update the `AUDIVERIS_PATH` in main.py:

```bash
# On VPS, edit the AUDIVERIS_PATH constant if needed
sed -i 's|/Applications/Audiveris.app/Contents/MacOS/Audiveris|/usr/local/bin/audiveris|g' /var/www/cubbyscore-backend/main.py
```

### 2.6 Create Backend systemd Service

```bash
cat > /etc/systemd/system/cubbyscore-backend.service << 'EOF'
[Unit]
Description=CubbyScore Backend (FastAPI)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/cubbyscore-backend
Environment=PATH=/var/www/cubbyscore-backend/venv/bin:/usr/local/bin:/usr/bin
Environment=SSL_CERT_FILE=/var/www/cubbyscore-backend/venv/lib/python3.11/site-packages/certifi/cacert.pem
ExecStart=/var/www/cubbyscore-backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8001
Restart=on-failure
RestartSec=10

# Increase timeout for long conversions
TimeoutStopSec=300

[Install]
WantedBy=multi-user.target
EOF
```

### 2.7 Enable and Start Backend

```bash
systemctl daemon-reload
systemctl enable cubbyscore-backend
systemctl start cubbyscore-backend

# Check status
systemctl status cubbyscore-backend
```

---

## Part 3: Frontend Deployment

### 3.1 Create Frontend Environment File (local)

Before building, create `.env.local` in your frontend directory:

```bash
cd /Users/willardjansen/dev/cubby-score-conversion/frontend

cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://cubbyscore.com/api
EOF
```

### 3.2 Build Frontend Locally

```bash
cd /Users/willardjansen/dev/cubby-score-conversion/frontend

# Install dependencies if needed
npm install

# Build for production
npm run build
```

### 3.3 Upload Frontend to VPS

```bash
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  ./ root@178.251.232.89:/var/www/cubbyscore-frontend/
```

### 3.4 Install Frontend Dependencies on VPS

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "cd /var/www/cubbyscore-frontend && npm install --production"
```

### 3.5 Create Frontend Environment File on VPS

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "cat > /var/www/cubbyscore-frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://cubbyscore.com/api
EOF"
```

### 3.6 Create Frontend systemd Service

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89

cat > /etc/systemd/system/cubbyscore-frontend.service << 'EOF'
[Unit]
Description=CubbyScore Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/cubbyscore-frontend
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3004

[Install]
WantedBy=multi-user.target
EOF
```

### 3.7 Enable and Start Frontend

```bash
systemctl daemon-reload
systemctl enable cubbyscore-frontend
systemctl start cubbyscore-frontend

# Check status
systemctl status cubbyscore-frontend
```

---

## Part 4: Caddy Configuration

### 4.1 Update Caddyfile

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89

# Edit Caddy configuration
cat >> /etc/caddy/Caddyfile << 'EOF'

cubbyscore.com {
    # Frontend - Next.js app
    reverse_proxy localhost:3004

    # Backend API - route /api/* to FastAPI
    handle /api/* {
        uri strip_prefix /api
        reverse_proxy localhost:8001 {
            # Increase timeouts for long OMR conversions
            transport http {
                read_timeout 30m
                write_timeout 30m
            }
        }
    }

    # Allow large file uploads (50MB)
    request_body {
        max_size 50MB
    }

    encode gzip

    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        Referrer-Policy strict-origin-when-cross-origin
    }
}

www.cubbyscore.com {
    redir https://cubbyscore.com{uri} permanent
}
EOF
```

### 4.2 Reload Caddy

```bash
# Validate config
caddy validate --config /etc/caddy/Caddyfile

# Reload
systemctl reload caddy
```

---

## Part 5: Verify Deployment

### 5.1 Check All Services

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89

# Check backend
systemctl status cubbyscore-backend
curl http://localhost:8001/health

# Check frontend
systemctl status cubbyscore-frontend
curl http://localhost:3004

# Check Caddy
systemctl status caddy
```

### 5.2 Test from Browser

1. Visit https://cubbyscore.com
2. Upload a test PDF
3. Verify conversion works

---

## Quick Reference

### Key Paths on VPS

| Purpose | Path |
|---------|------|
| Frontend App | `/var/www/cubbyscore-frontend/` |
| Backend App | `/var/www/cubbyscore-backend/` |
| Frontend Service | `/etc/systemd/system/cubbyscore-frontend.service` |
| Backend Service | `/etc/systemd/system/cubbyscore-backend.service` |
| Caddy Config | `/etc/caddy/Caddyfile` |
| Uploads | `/var/www/cubbyscore-backend/uploads/` |
| Outputs | `/var/www/cubbyscore-backend/outputs/` |

### Useful Commands

```bash
# View backend logs
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "journalctl -u cubbyscore-backend -f"

# View frontend logs
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "journalctl -u cubbyscore-frontend -f"

# Restart backend
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "systemctl restart cubbyscore-backend"

# Restart frontend
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "systemctl restart cubbyscore-frontend"

# Check disk space (uploads can fill up)
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "df -h"

# Clean old uploads (older than 24 hours)
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "find /var/www/cubbyscore-backend/uploads -mtime +1 -delete"
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "find /var/www/cubbyscore-backend/outputs -mtime +1 -delete"
```

---

## Redeployment Steps

### Backend Only

```bash
# From local machine
cd /Users/willardjansen/dev/cubby-score-conversion/backend

# Upload
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'venv' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  --exclude 'uploads/*' \
  --exclude 'outputs/*' \
  --exclude '.env' \
  ./ root@178.251.232.89:/var/www/cubbyscore-backend/

# Restart
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "systemctl restart cubbyscore-backend"
```

### Frontend Only

```bash
# From local machine
cd /Users/willardjansen/dev/cubby-score-conversion/frontend

# Build
npm run build

# Upload
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env.local' \
  ./ root@178.251.232.89:/var/www/cubbyscore-frontend/

# Restart
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "systemctl restart cubbyscore-frontend"
```

### Both

```bash
# Backend
cd /Users/willardjansen/dev/cubby-score-conversion/backend
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'venv' --exclude '__pycache__' --exclude '*.pyc' \
  --exclude 'uploads/*' --exclude 'outputs/*' --exclude '.env' \
  ./ root@178.251.232.89:/var/www/cubbyscore-backend/

# Frontend
cd /Users/willardjansen/dev/cubby-score-conversion/frontend
npm run build
rsync -avz -e "ssh -i ~/.ssh/id_ed25519" \
  --exclude 'node_modules' --exclude '.git' --exclude '.env.local' \
  ./ root@178.251.232.89:/var/www/cubbyscore-frontend/

# Restart both
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89 "systemctl restart cubbyscore-backend && systemctl restart cubbyscore-frontend"
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
journalctl -u cubbyscore-backend -n 100

# Test manually
cd /var/www/cubbyscore-backend
source venv/bin/activate
python -c "import main; print('OK')"
uvicorn main:app --host 0.0.0.0 --port 8001
```

### Audiveris not found

```bash
# Check if installed
which audiveris
audiveris -help

# Check Java
java -version
```

### homr model download fails (SSL error)

```bash
# Set SSL certificates
export SSL_CERT_FILE=$(python3.11 -c "import certifi; print(certifi.where())")
export REQUESTS_CA_BUNDLE=$SSL_CERT_FILE

# Or add to service file Environment=
```

### Conversion timeout

- Caddy is configured for 30-minute timeout
- For very large files, consider increasing or warning users to split PDFs

### Disk space full

```bash
# Check space
df -h

# Clean old files
find /var/www/cubbyscore-backend/uploads -mtime +1 -delete
find /var/www/cubbyscore-backend/outputs -mtime +1 -delete
```

---

## Cron Job for Cleanup (Optional)

Add automatic cleanup of old files:

```bash
ssh -i ~/.ssh/id_ed25519 root@178.251.232.89

# Add cron job
(crontab -l 2>/dev/null; echo "0 0 * * * find /var/www/cubbyscore-backend/uploads -mtime +1 -delete") | crontab -
(crontab -l 2>/dev/null; echo "0 0 * * * find /var/www/cubbyscore-backend/outputs -mtime +1 -delete") | crontab -

# Verify
crontab -l
```

---

## Performance Notes

- **Audiveris:** Fast (~15s for simple scores), requires Java 17+
- **homr:** Slower on CPU (54s/page on 8-core, 2-4 min/page on 2-core VPS)
- **Recommendation:** For VPS with limited cores, consider:
  - Limiting homr to 20 pages max
  - Recommending users split large scores
  - Using Audiveris as default (faster but struggles with scanned scores)
