# E-Commerce Microservices API Documentation

This document outlines the API endpoints exposed by the API Gateway of the E-Commerce Saga pattern microservices architecture. All external client interactions route through the API Gateway, which securely delegates commands and queries to the appropriate backend services (like the Orchestrator, Order, Inventory, Payment, and Shipping services).

## Base URL

```text
http://localhost:3000/api/v1
```

---

## 1. Endpoints

### 1.1. Place an Order (Checkout)

Initiates the checkout process by generating a new distributed transaction Saga.

- **URL**: `/orders/checkout`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `string` (UUID) | Yes | The unique identifier of the user placing the order. |
| `items` | `Array<OrderItem>` | Yes | A list of products being purchased. |
| `total_amount` | `number` | Yes | The total calculated monetary amount for the order. |

**OrderItem Object:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `product_id` | `string` (UUID) | Yes | The unique identifier for the product. |
| `quantity` | `number` | Yes | The quantity of the product. |
| `price` | `number` | Yes | The price of a single unit of the product. |

#### Request Example

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "product_id": "123e4567-e89b-12d3-a456-426614174000",
      "quantity": 2,
      "price": 49.99
    }
  ],
  "total_amount": 99.98
}
```

#### Response Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `saga_id` | `string` (UUID) | A unique tracking identifier for the distributed transaction. |
| `status` | `string` | Returns `"started"` indicating the orchestrator has accepted the workflow. |

#### Response Example (201 Created)

```json
{
  "saga_id": "a91a9b23-cd8e-4a6c-9457-3dc61234c890",
  "status": "started"
}
```

---

### 1.2. Get Saga (Order) Status

Since the saga pattern involves asynchronous eventual consistency, checking the status of an ongoing order requires polling this endpoint with the returned `saga_id`.

- **URL**: `/orders/saga/:saga_id`
- **Method**: `GET`
- **Content-Type**: `application/json`

#### Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `saga_id` | `string` (UUID) | Yes | The saga identifier received during checkout. |

#### Response Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `saga_id` | `string` (UUID) | The saga's unique tracking ID. |
| `order_id` | `string` (UUID) | The corresponding ID created for the `order_db`. |
| `current_state` | `SagaState` (Enum) | The current execution step of the state machine. |
| `step_history` | `Array<StepHistory>` | An audit log of all steps executed by the orchestrator. |
| `retry_count` | `Object` | Map dictionary recording retries for transient failures. |
| `order_data` | `Object` | The original checkout payload details. |
| `created_at` | `string` (ISO 8601) | When the saga started. |
| `updated_at` | `string` (ISO 8601) | When the saga state last mutated. |

**SagaState Enum Values:**
- `INIT`
- `ORDER_CREATED`
- `STOCK_RESERVED`
- `PAYMENT_COMPLETED`
- `SHIPPING_CREATED`
- `COMPLETED` (Success)
- `FAILED` (Compensating transactions complete)
- `COMPENSATING` (Currently rolling back)
- `UNKNOWN`

#### Response Example (200 OK)

```json
{
  "saga_id": "a91a9b23-cd8e-4a6c-9457-3dc61234c890",
  "order_id": "b18b4568-d01c-4b5c-8768-4ec62413a991",
  "current_state": "COMPLETED",
  "step_history": [
    {
      "step": "INIT",
      "state": "ORDER_CREATED",
      "timestamp": "2023-10-01T12:00:00.000Z",
      "command_id": "req-1"
    },
    {
      "step": "ORDER_CREATED",
      "state": "STOCK_RESERVED",
      "timestamp": "2023-10-01T12:00:01.000Z",
      "command_id": "req-2"
    }
  ],
  "retry_count": {},
  "order_data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_amount": 99.98
  },
  "created_at": "2023-10-01T12:00:00.000Z",
  "updated_at": "2023-10-01T12:00:05.000Z"
}
```

---

## 2. Standard Error Handling

All endpoints implement standard NestJS Global Exception Filters (`HttpExceptionFilter`). If a request fails natively or triggers business logic errors, it returns the following standard error schema:

#### Standard Error Response Schema

| Field | Type | Description |
| :--- | :--- | :--- |
| `statusCode` | `number` | The HTTP Status Code (e.g., `400`, `404`, `500`). |
| `timestamp` | `string` (ISO 8601) | Exact time the exception occurred. |
| `path` | `string` | The requested route path. |
| `message` | `string` / `Array<string>` | The detail or validation error describing why the request failed. |

#### Error Response Example (400 Bad Request)

```json
{
  "statusCode": 400,
  "timestamp": "2023-10-01T12:00:10.000Z",
  "path": "/api/v1/orders/checkout",
  "message": "Invalid product ID format."
}
```

#### Error Response Example (500 Internal Server Error)

```json
{
  "statusCode": 500,
  "timestamp": "2023-10-01T12:00:15.000Z",
  "path": "/api/v1/orders/saga/invalid-saga",
  "message": "Failed to get saga status: Request failed with status code 500"
}
```

---

## 3. Internal System APIs

> [!NOTE]
> **Internal Services Only**
> The following endpoints are strictly for service-to-service (RPC) communication within the private Docker network. They are not exposed to the public internet by the API Gateway.

### 3.1. Orchestrator Service

The Orchestrator Service manages the lifecycle of the distributed transaction.

#### 3.1.1. Start Saga
- **URL**: `http://orchestrator-service:3001/saga/start`
- **Method**: `POST`
- **Content-Type**: `application/json`

**Request Schema:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `saga_id` | `string` (UUID) | Yes | The generated UUID for the saga. |
| `order_request` | `Object` | Yes | The original checkout request payload. |

**Response**: Returns the `saga_id` and `{ "status": "started" }`.

#### 3.1.2. Get Saga Status
- **URL**: `http://orchestrator-service:3001/saga/:saga_id/status`
- **Method**: `GET`
- **Content-Type**: `application/json`

**Response**: Returns the full `SagaStateEntity` (see section 1.2 for the schema).

---

### 3.2. Worker Services (Command pattern)

The **Order**, **Inventory**, **Payment**, and **Shipping** services all implement a standard asynchronous Command endpoint to process steps of the saga.

- **Base URLs**:
  - `http://order-service:3002/api/v1/command`
  - `http://inventory-service:3003/api/v1/command`
  - `http://payment-service:3004/api/v1/command`
  - `http://shipping-service:3005/api/v1/command`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Schema (SagaCommand)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `saga_id` | `string` (UUID) | Yes | The saga transaction identifier. |
| `request_id` | `string` (UUID) | Yes | Unique ID for idempotency of this specific command. |
| `command_type` | `CommandType` | Yes | The action to perform. |
| `timestamp` | `string` (ISO) | Yes | When the command was issued. |
| `payload` | `Object` | Yes | Data required to execute the command. |
| `retry_count` | `number` | No | How many times this command has been retried. |

**CommandType Enum Values:**
- `CREATE_ORDER`
- `RESERVE_STOCK`
- `CHARGE_PAYMENT`
- `CREATE_SHIPMENT`
- `RELEASE_STOCK` (Compensating action)
- `REFUND_PAYMENT` (Compensating action)
- `CANCEL_ORDER` (Compensating action)

#### Request Example (SagaCommand)

```json
{
  "saga_id": "a91a9b23-cd8e-4a6c-9457-3dc61234c890",
  "request_id": "req-12345",
  "command_type": "RESERVE_STOCK",
  "timestamp": "2023-10-01T12:00:01.000Z",
  "payload": {
    "items": [
      {
        "product_id": "123e4567-e89b-12d3-a456-426614174000",
        "quantity": 2
      }
    ]
  },
  "retry_count": 0
}
```

#### Response Schema (SagaResponse)

| Field | Type | Description |
| :--- | :--- | :--- |
| `saga_id` | `string` (UUID) | The saga transaction identifier. |
| `request_id` | `string` (UUID) | Matches the `request_id` from the `SagaCommand`. |
| `success` | `boolean` | `true` if the command completed successfully, `false` otherwise. |
| `message` | `string` | Status message or error description. |
| `data` | `Object` | Optional return data (e.g., generated database IDs). |

#### Response Example (Success)

```json
{
  "saga_id": "a91a9b23-cd8e-4a6c-9457-3dc61234c890",
  "request_id": "req-12345",
  "success": true,
  "message": "Stock reserved successfully"
}
```

#### Response Example (Failure - Triggers Compensation)

```json
{
  "saga_id": "a91a9b23-cd8e-4a6c-9457-3dc61234c890",
  "request_id": "req-12345",
  "success": false,
  "message": "Insufficient stock for product 123e4567"
}
```
