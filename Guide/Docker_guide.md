# 🐳 Docker Containerization Guide

## 📋 **Overview**

This guide will help you containerize your React + Flask application with the following architecture:

- **Frontend Container**: React app + Nginx (serves static files and proxies API calls)
- **Backend Container**: Flask API + Python dependencies
- **External Database**: AWS RDS PostgreSQL (existing, no container needed)

## 🏗️ **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────┐
│                    EC2 Instance                         │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  Frontend        │    │  Backend         │          │
│  │  Container       │    │  Container       │          │
│  │  ┌─────────────┐ │    │  ┌─────────────┐ │          │
│  │  │   Nginx     │ │    │  │   Flask     │ │          │
│  │  │   (Port 80) │ │    │  │ (Port 5002) │ │          │
│  │  │             │ │    │  │             │ │          │
│  │  │ React Build │ │    │  │ Python Deps │ │          │
│  │  └─────────────┘ │    │  └─────────────┘ │          │
│  └──────────────────┘    └──────────────────┘          │
│           │                        │                   │
└───────────┼────────────────────────┼───────────────────┘
            │                        │
            │ (API Proxy)            │ (DB Connection)
            │                        │
            ▼                        ▼
    ┌─────────────┐          ┌─────────────┐
    │    Users    │          │   AWS RDS   │
    │  (Browser)  │          │ PostgreSQL  │
    └─────────────┘          └─────────────┘
```

## 📁 **Required Files Structure**

After following this guide, your project structure will look like:

```
react-fuid-system/
├── backend-deploy/           # Backend source code
│   ├── server.py
│   ├── requirements.txt
│   ├── .env.production
│   └── Dockerfile           # ← New
├── src/                     # Frontend source code
├── public/
├── package.json
├── Dockerfile               # ← New (Frontend)
├── docker-compose.yml       # ← New
├── nginx.conf              # ← New
└── .dockerignore           # ← New
```

---

## 🔧 **Step 1: Create Backend Dockerfile**

Create `/backend-deploy/Dockerfile`:

```dockerfile
# Use Python 3.12 (matches Ubuntu 24.04)
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better caching)
COPY requirements_minimal.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements_minimal.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1

# Start the application
CMD ["python", "server.py"]
```

---

## 🔧 **Step 2: Create Frontend Dockerfile**

Create `/Dockerfile` (in root directory):

```dockerfile
# Multi-stage build for React app
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Build the React app
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built React app
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔧 **Step 3: Create Nginx Configuration**

Create `/nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;

    # Serve React static files
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:5002/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Handle CORS
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization";
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
            add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization";
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Proxy compatibility routes (without /api prefix)
    location ~ ^/(auth|health|data|search)/ {
        proxy_pass http://backend:5002$request_uri;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

---

## 🔧 **Step 4: Create Docker Compose File**

Create `/docker-compose.yml`:

```yaml
version: '3.8'

services:
  # Backend Service
  backend:
    build:
      context: ./backend-deploy
      dockerfile: Dockerfile
    container_name: fuid-backend
    ports:
      - "5002:5002"
    environment:
      - FLASK_ENV=production
      - DATABASE_URL=postgresql://internsdb:Interns%232025@database-1.cbw00kmqksds.us-east-2.rds.amazonaws.com:5432/fuiddb
      - PORT=5002
    volumes:
      - ./backend-deploy/.env.production:/app/.env.production:ro
    networks:
      - fuid-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Frontend Service
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fuid-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - fuid-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  fuid-network:
    driver: bridge

# Optional: Add volumes for persistent data
volumes:
  backend-logs:
    driver: local
```

---

## 🔧 **Step 5: Create .dockerignore Files**

Create `/.dockerignore` (for frontend):

```
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git
.gitignore
README.md
.env
.nyc_output
coverage
.DS_Store
*.log
backend-deploy
Unique-id
.vscode
.idea
```

Create `/backend-deploy/.dockerignore`:

```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
.venv
.env
*.pem
*.key
.DS_Store
node_modules
```

---

## 🚀 **Step 6: Build and Test Locally**

### **6.1 Build the Images**

```bash
# Navigate to project root
cd /Users/arabellyabhinav/Desktop/Flywl/Unique-id/react-fuid-system

# Build both containers
docker-compose build

# Or build individually
docker-compose build backend
docker-compose build frontend
```

### **6.2 Run Locally**

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test the application
curl http://localhost/health
curl http://localhost/api/health
```

### **6.3 Stop Services**

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

---

## 🚀 **Step 7: Deploy to EC2**

### **7.1 Prepare EC2 Instance**

```bash
# SSH into your EC2 instance
ssh -i fuid-1.pem ubuntu@ec2-3-150-134-228.us-east-2.compute.amazonaws.com

# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Log out and back in for group changes to take effect
exit
```

### **7.2 Transfer Files to EC2**

```bash
# From your local machine
cd /Users/arabellyabhinav/Desktop/Flywl/Unique-id/react-fuid-system

# Create deployment package (excluding sensitive files)
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.pem' \
    --exclude='*.key' \
    --exclude='__pycache__' \
    --exclude='.venv' \
    -czf fuid-app.tar.gz .

# Transfer to EC2
scp -i fuid-1.pem fuid-app.tar.gz ubuntu@ec2-3-150-134-228.us-east-2.compute.amazonaws.com:/home/ubuntu/

# SSH back into EC2
ssh -i fuid-1.pem ubuntu@ec2-3-150-134-228.us-east-2.compute.amazonaws.com

# Extract files
cd /home/ubuntu
tar -xzf fuid-app.tar.gz
```

### **7.3 Create Environment File on EC2**

```bash
# Create the environment file
cat > backend-deploy/.env.production << EOF
# AWS RDS PostgreSQL Configuration
DATABASE_URL=postgresql://internsdb:Interns%232025@database-1.cbw00kmqksds.us-east-2.rds.amazonaws.com:5432/fuiddb
FLASK_ENV=production
PORT=5002

# Database Configuration
DB_HOST=database-1.cbw00kmqksds.us-east-2.rds.amazonaws.com
DB_PORT=5432
DB_NAME=fuiddb
DB_USER=internsdb
DB_PASSWORD=Interns#2025

# Application Settings
FLASK_APP=server.py
PYTHONPATH=/app
EOF
```

### **7.4 Deploy on EC2**

```bash
# Build and start containers
docker-compose build
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f

# Test the deployment
curl http://localhost/health
curl http://localhost/api/health
```

---

## 🔧 **Step 8: Production Optimizations**

### **8.1 Add SSL/HTTPS (Optional)**

Update `nginx.conf` for SSL:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;
    
    # ... rest of configuration
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### **8.2 Add Monitoring**

Add to `docker-compose.yml`:

```yaml
  # Monitoring (optional)
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 30
```

### **8.3 Backup Strategy**

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec backend pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
EOF

chmod +x backup.sh
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

1. **Port conflicts**: Change ports in `docker-compose.yml`
2. **Database connection**: Verify RDS security groups allow EC2 access
3. **Build failures**: Check Dockerfile syntax and dependencies
4. **Network issues**: Ensure containers are on same network

### **Useful Commands**

```bash
# View container logs
docker-compose logs -f [service-name]

# Execute commands in container
docker-compose exec backend bash
docker-compose exec frontend sh

# Rebuild specific service
docker-compose build --no-cache backend

# Check container health
docker-compose ps
docker stats

# Clean up
docker system prune -a
docker volume prune
```

### **Debug Database Connection**

```bash
# Test from backend container
docker-compose exec backend python -c "
import psycopg
conn = psycopg.connect('postgresql://internsdb:Interns%232025@database-1.cbw00kmqksds.us-east-2.rds.amazonaws.com:5432/fuiddb')
print('✅ Database connection successful!')
conn.close()
"
```

---

## 🎯 **Next Steps**

1. **✅ Follow steps 1-6** to containerize locally
2. **✅ Test thoroughly** before deploying to EC2
3. **✅ Deploy to EC2** using steps 7-8
4. **✅ Set up monitoring** and backups
5. **✅ Configure domain** and SSL if needed

## 📞 **Support**

If you encounter issues:
1. Check container logs: `docker-compose logs -f`
2. Verify network connectivity between containers
3. Ensure RDS security groups allow EC2 access
4. Test database connection from backend container

---

**🎉 Congratulations! Your application is now fully containerized and ready for production deployment!**
