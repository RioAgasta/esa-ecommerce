import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('reservations')
export class ReservationEntity {
  @PrimaryColumn('uuid')
  reservation_id: string;

  @Column('uuid')
  saga_id: string;

  @Column('uuid')
  product_id: string;

  @Column()
  quantity: number;

  @CreateDateColumn()
  created_at: Date;
}
