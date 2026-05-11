export class CreateOrderRequest {
  user_id!: string;
  items!: OrderItem[];
  total_amount!: number;
}

export class OrderItem {
  product_id!: string;
  quantity!: number;
  price!: number;
}

export class OrderResponse {
  order_id!: string;
  status!: string;
  created_at!: Date;
}
