export enum SagaState {
  INIT = 'INIT',
  ORDER_CREATED = 'ORDER_CREATED',
  STOCK_RESERVED = 'STOCK_RESERVED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  SHIPPING_CREATED = 'SHIPPING_CREATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  UNKNOWN = 'UNKNOWN',
}

export enum CommandType {
  CREATE_ORDER = 'CREATE_ORDER',
  RESERVE_STOCK = 'RESERVE_STOCK',
  CHARGE_PAYMENT = 'CHARGE_PAYMENT',
  CREATE_SHIPMENT = 'CREATE_SHIPMENT',
  RELEASE_STOCK = 'RELEASE_STOCK',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
  CANCEL_ORDER = 'CANCEL_ORDER',
}

export interface SagaCommand {
  saga_id: string;
  request_id: string;
  command_type: CommandType;
  timestamp: Date;
  payload: Record<string, any>;
  retry_count?: number;
}

export interface SagaResponse {
  saga_id: string;
  request_id: string;
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

export interface SagaStateEntity {
  saga_id: string;
  order_id: string;
  current_state: SagaState;
  step_history: StepHistory[];
  retry_count: Record<string, number>;
  created_at: Date;
  updated_at: Date;
}

export interface StepHistory {
  step: string;
  state: SagaState;
  timestamp: Date;
  command_id: string;
}

export interface CircuitBreakerConfig {
  failure_threshold: number;
  success_threshold: number;
  timeout_ms: number;
  name: string;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}
