import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SagaStateEnum {
  INIT = 'INIT',
  ORDER_CREATED = 'ORDER_CREATED',
  STOCK_RESERVED = 'STOCK_RESERVED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  SHIPPING_CREATED = 'SHIPPING_CREATED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
}

@Entity('sagas')
export class SagaEntity {
  @PrimaryColumn('uuid')
  saga_id: string;

  @Column()
  order_id: string;

  @Column({
    type: 'enum',
    enum: SagaStateEnum,
    default: SagaStateEnum.INIT,
  })
  current_state: SagaStateEnum;

  @Column({ type: 'jsonb', default: [] })
  step_history: any[];

  @Column({ type: 'jsonb', default: {} })
  retry_count: Record<string, number>;

  @Column({ type: 'jsonb', nullable: true })
  order_data: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
