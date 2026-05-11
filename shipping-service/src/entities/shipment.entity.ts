import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ShipmentStatus {
  PENDING = 'PENDING',
  SHIPPED = 'SHIPPED',
  CANCELLED = 'CANCELLED',
}

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryColumn('uuid')
  shipment_id: string;

  @Column('uuid')
  saga_id: string;

  @Column('uuid')
  order_id: string;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Column({ nullable: true })
  tracking_number: string;

  @Column({ nullable: true })
  error_message: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
