# 🛍️ ShopWave — Full-Stack E-Commerce Microservices Platform

A production-grade e-commerce application built with **React + Material UI** frontend and **5 microservices**, deployed on AWS EKS using the complete DevOps toolchain.

```
React MUI Frontend → Nginx API Gateway
  ├── Auth Service      (Node.js  + PostgreSQL + Redis)
  ├── Product Service   (Python   + MongoDB    + Redis cache)
  ├── Order Service     (Go       + PostgreSQL)
  ├── Payment Service   (Node.js  + PostgreSQL + Redis)
  └── Notification Svc  (Node.js  + MongoDB    + Redis pub/sub)
```

---

## 📦 Project Structure

```
shopwave/
├── frontend/                    # React + Material UI SPA
│   ├── src/
│   │   ├── pages/               # All page components
│   │   ├── components/layout/   # AppBar, Footer, Layout
│   │   ├── store/               # Zustand (auth + cart)
│   │   └── utils/api.js         # Axios with JWT interceptor
│   └── Dockerfile
├── services/
│   ├── auth-service/            # Node.js — register, login, JWT, Redis sessions
│   ├── product-service/         # Python Flask — MongoDB catalog, Redis cache
│   ├── order-service/           # Go — order lifecycle, PostgreSQL
│   ├── payment-service/         # Node.js — mock Stripe, PostgreSQL
│   ├── notification-service/    # Node.js — MongoDB logs, Redis pub/sub
│   └── api-gateway/             # Nginx — routing, rate limiting, security headers
├── terraform/
│   ├── modules/                 # vpc · eks · ecr · rds · elasticache
│   └── environments/dev/
├── ansible/                     # roles: common · docker · k8s-node
├── helm/                        # chart per service + umbrella
├── argocd/applications/         # App-of-Apps GitOps pattern
├── jenkins/Jenkinsfile
├── .github/workflows/ci.yml
├── k8s/base/                    # namespaces · quotas · network policies
├── monitoring/prometheus/
└── docker-compose.yml           # Full local stack
```

---

## 🗄️ Database Architecture

| Service             | Database                        | Why |
|---------------------|---------------------------------|-----|
| Auth Service        | **PostgreSQL** + Redis sessions | Relational users, fast session lookup |
| Product Service     | **MongoDB** + Redis cache       | Flexible product schema, cached reads |
| Order Service       | **PostgreSQL**                  | ACID transactions for orders |
| Payment Service     | **PostgreSQL** + Redis          | Consistent payment records |
| Notification Service| **MongoDB** + Redis pub/sub     | Event log, async messaging |

---

## 🚀 Quick Start — Local Dev

```bash
git clone https://github.com/YOUR_ORG/shopwave.git
cd shopwave

# Start everything (10 containers total)
docker-compose up --build -d

# Wait ~45s for all services to init, then visit:
# Frontend:  http://localhost
# Auth API:  http://localhost/api/users
# Products:  http://localhost/api/products
# Orders:    http://localhost/api/orders
# Payments:  http://localhost/api/payments
```

**Demo credentials:**
- Email: `demo@shopwave.com`
- Password: `demo123`

**Test card numbers:**
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`

---

## ☁️ AWS Deployment

### 1. Prerequisites
```bash
aws configure        # set your AWS credentials
terraform --version  # ≥ 1.5
kubectl version      # ≥ 1.28
helm version         # ≥ 3.14
ansible --version    # ≥ 2.15
```

### 2. Provision Infrastructure
```bash
# Create S3 state bucket first (one-time)
aws s3 mb s3://shopwave-tf-state --region us-east-1
aws dynamodb create-table \
  --table-name terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Update bucket name in terraform/environments/dev/main.tf, then:
cd terraform/environments/dev
terraform init
terraform apply    # provisions VPC, EKS, ECR
```

### 3. Configure Nodes with Ansible
```bash
# Update ansible/inventory.ini with your EC2 IPs
ansible-playbook -i ansible/inventory.ini ansible/playbooks/site.yml
```

### 4. Push Docker Images to ECR
```bash
ECR=$(aws ecr describe-repositories --query 'repositories[0].repositoryUri' --output text | cut -d/ -f1)
aws ecr get-login-password | docker login --username AWS --password-stdin $ECR

for svc in auth-service product-service order-service payment-service notification-service api-gateway; do
  docker build -t $ECR/shopwave/$svc:latest services/$svc
  docker push $ECR/shopwave/$svc:latest
done
docker build -t $ECR/shopwave/frontend:latest frontend
docker push $ECR/shopwave/frontend:latest
```

### 5. Deploy with Helm
```bash
aws eks update-kubeconfig --region us-east-1 --name shopwave-eks
kubectl apply -f k8s/base/namespaces.yaml

# Update ECR URL in each helm/*/values.yaml, then:
helm install shopwave helm/umbrella --namespace shopwave --create-namespace
```

### 6. Install ArgoCD (GitOps)
```bash
# Update YOUR_ORG in argocd/applications/*.yaml, then:
bash argocd/install.sh shopwave-eks us-east-1
```

### 7. Install Monitoring
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/prometheus/values.yaml
```

---

## 🔁 CI/CD Flow

```
git push → GitHub Actions
  ├── Test all 5 services in parallel
  ├── Build + push Docker images to ECR
  ├── Trivy security scan
  └── Update GitOps repo (bump image tags)
         ↓
       ArgoCD detects change
         ↓
       Sync Helm charts → EKS
         ↓
       Prometheus scrapes metrics
       Grafana visualises dashboards
```

---

## 🧪 API Reference

### Auth Service (`/api/users`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/register` | Create account |
| POST | `/api/users/login` | Login, returns JWT |
| GET  | `/api/users/me` | Get profile (auth required) |
| POST | `/api/users/logout` | Logout |

### Product Service (`/api/products`)
| Method | Path | Description |
|--------|------|-------------|
| GET  | `/api/products` | List with filter/sort/page |
| GET  | `/api/products/:id` | Get one product |
| GET  | `/api/products/categories` | List categories |

### Order Service (`/api/orders`)
| Method | Path | Description |
|--------|------|-------------|
| POST  | `/api/orders` | Create order |
| GET   | `/api/orders/my` | My orders list |
| GET   | `/api/orders/:id` | Order detail |
| PATCH | `/api/orders/:id/status` | Update status |

### Payment Service (`/api/payments`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments` | Process payment |
| GET  | `/api/payments/:id` | Get payment |
| POST | `/api/payments/:id/refund` | Refund |

### Notification Service (`/api/notifications`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notifications/send` | Send notification |
| POST | `/api/notifications/publish` | Publish event |
| GET  | `/api/notifications/user/:id` | User notifications |

---

## ✅ Checklist Before Production

- [ ] Replace all `YOUR_ORG` and `YOUR_AWS_ACCOUNT` placeholders
- [ ] Move secrets to AWS Secrets Manager / K8s Sealed Secrets
- [ ] Enable HTTPS with ACM + ALB Ingress Controller
- [ ] Set `deletion_protection = true` on RDS instances
- [ ] Replace mock payment with real Stripe integration
- [ ] Set up real email via SendGrid/SES in notification service
- [ ] Configure proper IAM roles with least-privilege
- [ ] Change default Grafana admin password

---

## 🛠️ Service Ports (local)

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| API Gateway | 80 | http://localhost |
| Auth Service | 3001 | http://localhost:3001/health |
| Product Service | 3002 | http://localhost:3002/health |
| Order Service | 3003 | http://localhost:3003/health |
| Payment Service | 3004 | http://localhost:3004/health |
| Notification Service | 3005 | http://localhost:3005/health |
| PostgreSQL (auth) | 5432 | |
| PostgreSQL (orders) | 5433 | |
| PostgreSQL (payments) | 5434 | |
| MongoDB | 27017 | |
| Redis | 6379 | |
