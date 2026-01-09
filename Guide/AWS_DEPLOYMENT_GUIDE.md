# 🚀 Complete AWS Deployment Guide for FUID App

This comprehensive guide will help you deploy your React frontend and Flask backend to AWS with proper infrastructure setup.

## 📋 Prerequisites

- AWS account with appropriate permissions
- SSH key pair for EC2 access
- React app ready for production
- Flask backend ready for deployment

## 🔧 Step-by-Step Deployment

### Phase 1: Prepare React App for Production

#### Step 1: Create Environment Configuration
```bash
# In your React app root directory (react-fuid-system)
echo "REACT_APP_API_URL=/api" > .env.production
```

#### Step 2: Build React App
```bash
# Install dependencies and build
npm install
npm run build
```
This creates a `build/` folder with production-ready files.

#### Step 3: Prepare Backend Files
```bash
# Ensure all backend files are in the backend/ directory
# The backend folder should contain:
# - server.py
# - embedding_manager.py
# - rag_manager.py
# - requirements.txt
# - company_data.json (or symlink to it)
```

### Phase 2: AWS Infrastructure Setup

#### Step 4: Create VPC
1. Go to **VPC Dashboard** → **Create VPC**
2. Select **"VPC and more"** (this automatically creates public subnet and internet gateway)
3. Fill out base information:
   - **CIDR:** `10.0.0.0/16`
   - **VPC name:** `fuid-vpc`
   - **Public subnet name:** `fuid-public-subnet`
   - **Public subnet CIDR:** `10.0.0.0/20`
   - **Availability Zone:** Choose any AZ
4. Click **Create VPC**

**Note:** Selecting "VPC and more" automatically creates:
- ✅ Public subnet
- ✅ Internet gateway
- ✅ Route table with internet access
- ✅ Network ACL
- ✅ Security group

### Phase 3: Create EC2 Instance

#### Step 5: Launch EC2 Instance
1. Go to **EC2 Dashboard** → **Launch Instance**
2. Configure:
   - **Name:** `fuid-app-server`
   - **AMI:** Amazon Linux 2023 or Ubuntu 22.04
   - **Instance type:** t2.micro (free tier) or larger
   - **Key pair:** Create new or select existing (SAVE THE KEY!)
   - **Network settings:**
     - **VPC:** Select your created VPC
     - **Subnet:** Select your public subnet
     - **Auto-assign public IP:** Enable

#### Step 6: Create Security Group
1. In **Security Groups** → **Create Security Group**
2. Configure:
   - **Name:** `fuid-app-sg`
   - **Description:** `Security group for FUID app`
   - **VPC:** Select your VPC
3. **Inbound Rules:**
   - **HTTP:** TCP, Port 80, Source 0.0.0.0/0
   - **HTTPS:** TCP, Port 443, Source 0.0.0.0/0
   - **SSH:** TCP, Port 22, Source Your IP (or 0.0.0.0/0 for testing)
4. **Outbound Rules:** All traffic (default)

### Phase 4: Deploy to EC2

#### Step 7: Connect to EC2 Instance
```bash
# Replace with your actual key path and IP
ssh -i ~/keys/my-ec2.pem ubuntu@<EC2-IP-ADDRESS>
```

#### Step 8: Install Nginx
```bash
sudo apt update
sudo apt install -y nginx
```

#### Step 9: Create Web Root Directory
```bash
sudo mkdir -p /var/www/fuid-app
sudo chown -R www-data:www-data /var/www/fuid-app
sudo chmod -R 755 /var/www/fuid-app
```

#### Step 10: Copy React Build to EC2
```bash
# From your local terminal (not in EC2)
scp -i ~/keys/my-ec2.pem -r ./build ubuntu@<EC2-IP-ADDRESS>:/home/ubuntu/react-build
```

#### Step 11: Copy Files to Web Root
```bash
# Back in EC2 terminal
sudo rsync -avh --delete /home/ubuntu/react-build/ /var/www/fuid-app/
```

#### Step 12: Copy Backend to EC2
```bash
# From your local terminal (not in EC2)
scp -i ~/keys/my-ec2.pem -r ./backend ubuntu@<EC2-IP-ADDRESS>:/home/ubuntu/backend
```

#### Step 13: Create Nginx Configuration`
```bash
# In EC2 terminal
sudo nano /etc/nginx/sites-available/fuid-app
```

**Paste this configuration:**
```nginx
server {
    listen 80;
    server_name _;
    
    root /var/www/fuid-app;
    index index.html;
    
    # Proxy API calls to backend running on port 5002
    location /api/ {
        proxy_pass http://127.0.0.1:5002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # React SPA routing
    location / {
        try_files $uri /index.html;
    }
}
```

#### Step 14: Enable Nginx Site
```bash
sudo ln -s /etc/nginx/sites-available/fuid-app /etc/nginx/sites-enabled/fuid-app
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 15: Create Backend Service
```bash
sudo nano /etc/systemd/system/backend.service
```

**Paste this service configuration:**
```ini
[Unit]
Description=FUID Python Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/backend
Environment="FLASK_APP=server.py"
ExecStart=/usr/bin/flask run --host=127.0.0.1 --port=5002
Restart=always

[Install]
WantedBy=multi-user.target
```

#### Step 16: Enable and Start Backend Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable backend
sudo systemctl start backend
sudo systemctl status backend
```

### Phase 5: Load Balancer Setup

-p#### Step 17: Create Target Group
1. Go to **EC2** → **Target Groups** → **Create Target Group**
2. Configure:
   - **Target type:** Instances
   - **Protocol:** HTTP
   - **Port:** 80
   - **VPC:** Select your EC2 VPC
   - **Health check path:** `/`
3. **Register targets:**
   - Select your EC2 instance
   - Port: 80
4. Click **Create Target Group**

#### Step 18: Create Application Load Balancer
1. Go to **EC2** → **Load Balancers** → **Create Load Balancer** → **Application**
2. Configure:
   - **Name:** `fuid-alb`
   - **Scheme:** Internet-facing
   - **IP address type:** IPv4
   - **Network mapping:** Select your VPC and subnets
   - **Security group:** Select your security group (allows HTTP 80 and HTTPS 443)
3. **Listeners:**
   - HTTP: 80
   - HTTPS: 443 (optional)
4. **Default routing:** Select your target group
5. Click **Create Load Balancer**

#### Step 19: Get Load Balancer DNS Name
1. After creation, note the **DNS name** of your ALB
2. This will be your public URL for the application

## 🎯 Quick Commands Reference

### Local Terminal Commands (Run from project directory)
```bash
# Build React app
npm run build

# Copy build to EC2
scp -i ~/keys/my-ec2.pem -r ./build ubuntu@<EC2-IP-ADDRESS>:/home/ubuntu/react-build

# Copy backend to EC2
scp -i ~/keys/my-ec2.pem -r ./backend ubuntu@<EC2-IP-ADDRESS>:/home/ubuntu/backend

# Connect to EC2
ssh -i ~/keys/my-ec2.pem ubuntu@<EC2-IP-ADDRESS>
```

### EC2 Terminal Commands
```bash
# Install Nginx
sudo apt update && sudo apt install -y nginx

# Setup web directory
sudo mkdir -p /var/www/fuid-app
sudo chown -R www-data:www-data /var/www/fuid-app
sudo chmod -R 755 /var/www/fuid-app

# Copy files
sudo rsync -avh --delete /home/ubuntu/react-build/ /var/www/fuid-app/

# Setup Nginx (after creating config file)
sudo ln -s /etc/nginx/sites-available/fuid-app /etc/nginx/sites-enabled/fuid-app
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Setup backend service (after creating service file)
sudo systemctl daemon-reload
sudo systemctl enable backend
sudo systemctl start backend
```

## 🔍 Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
sudo nginx -t
```

### Check Backend Status
```bash
sudo systemctl status backend
sudo journalctl -u backend -f
```

### Check Logs
```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Backend logs
sudo journalctl -u backend -f
```

### Restart Services
```bash
sudo systemctl restart nginx
sudo systemctl restart backend
```

### Check Load Balancer Health
1. Go to **Target Groups** → Select your target group
2. Check **Targets** tab for health status
3. Verify health checks are passing

## 🌐 Access Your App

Once deployed, your app will be available at:
- **Direct EC2:** `http://<EC2-IP-ADDRESS>`
- **Load Balancer:** `http://<ALB-DNS-NAME>`
- **API:** Both URLs + `/api/`

## 📝 Important Notes

- Replace `<EC2-IP-ADDRESS>` with your actual EC2 instance IP
- Replace `<ALB-DNS-NAME>` with your Load Balancer DNS name
- Make sure your security groups allow appropriate traffic
- The backend runs on port 5002 internally, accessible via `/api/` through Nginx
- React app uses client-side routing, so Nginx serves `index.html` for all routes
- **SAVE YOUR EC2 KEY PAIR** - you'll need it for SSH access
- Consider setting up HTTPS with SSL certificates for production

## 🔗 Helpful Resources

- [AWS VPC Setup Video](https://www.youtube.com/watch?v=ApGz8tpNLgo) - Extremely helpful for VPC configuration
- AWS Documentation for each service
- Nginx configuration documentation
