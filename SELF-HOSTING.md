# Self-Hosting

## Quick Start (Pre-built Images)

```bash
# Full app (webapp + relay)
docker run -d -p 8080:8080 ghcr.io/0xa1bed0/arcanum:latest

# Relay only
docker run -d -p 8080:8080 ghcr.io/0xa1bed0/arcanum-relay:latest
```

That's it. No building required.

---

## Build From Source

```bash
# Full app
docker build -f docker/Dockerfile.app -t arcanum .
docker run -d -p 8080:8080 arcanum

# Relay only
cd server
docker build -t arcanum-relay .
docker run -d -p 8080:8080 arcanum-relay
```

---

## Docker Compose

```yaml
services:
  arcanum:
    image: ghcr.io/0xa1bed0/arcanum:latest
    ports:
      - "8080:8080"
    restart: unless-stopped
```

```bash
docker-compose up -d
```

---

## Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: arcanum
spec:
  replicas: 1
  selector:
    matchLabels:
      app: arcanum
  template:
    metadata:
      labels:
        app: arcanum
    spec:
      containers:
        - name: arcanum
          image: ghcr.io/0xa1bed0/arcanum:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 30
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: arcanum
spec:
  selector:
    app: arcanum
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: arcanum
  annotations:
    nginx.ingress.kubernetes.io/proxy-read-timeout: "86400"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "86400"
spec:
  rules:
    - host: arcanum.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: arcanum
                port:
                  number: 80
```

```bash
kubectl apply -f arcanum.yaml
```

---

## Heroku

```bash
heroku container:login
heroku create your-arcanum-app
heroku container:pull web -a your-arcanum-app --image ghcr.io/0xa1bed0/arcanum:latest
heroku container:release web -a your-arcanum-app
```

Or from source:
```bash
cd server
heroku container:push web -a your-arcanum-app
heroku container:release web -a your-arcanum-app
```

## DigitalOcean App Platform

1. Create App → Docker Hub / Container Registry
2. Image: `ghcr.io/0xa1bed0/arcanum:latest`
3. HTTP Port: `8080`
4. Deploy

---

## Manual (Node.js + PM2)

```bash
cd server && npm install
npm install -g pm2

pm2 start server.js --name arcanum
pm2 save
pm2 startup
```

---

## Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name arcanum.example.com;

    ssl_certificate /etc/letsencrypt/live/arcanum.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arcanum.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

---

## Health Check

```bash
curl http://localhost:8080/health
# {"status":"ok","waiting":0}
```

---

## Images

| Image | Description |
|-------|-------------|
| `ghcr.io/0xa1bed0/arcanum:latest` | Full app (webapp + relay) |
| `ghcr.io/0xa1bed0/arcanum-relay:latest` | Relay only |

Tags: `latest`, `main`, `v1.0.0` (semver releases)
