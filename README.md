# 🚀 Saga Orchestration E-Commerce Microservices

Complete implementation of **Saga Orchestration Pattern** for e-commerce checkout flow with **Circuit Breaker**, **Retry Logic**, and **Compensation Transactions**.

## 📊 Architecture

```
Client → API Gateway (3000)
           └── Orchestrator (3001)
                 ├── Order Service    (3002)
                 ├── Inventory Service(3003)
                 ├── Payment Service  (3004)
                 └── Shipping Service (3005)
```

## 🚦 Saga Flow

1. `CREATE_ORDER`   → Order Service
2. `RESERVE_STOCK`  → Inventory Service
3. `CHARGE_PAYMENT` → Payment Service
4. `CREATE_SHIPMENT`→ Shipping Service

On failure, compensation transactions are executed in reverse order.

## 🛠 Quick Start

```bash
docker-compose up --build
```

## 📬 API

### Start checkout
```
POST http://localhost:3000/api/v1/orders/checkout
{
  "user_id": "user-123",
  "items": [{ "product_id": "prod-1", "quantity": 2, "price": 50 }],
  "total_amount": 100
}
```

### Check saga status
```
GET http://localhost:3000/api/v1/orders/saga/:saga_id
```
