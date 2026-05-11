import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory')
export class InventoryEntity {
  @PrimaryColumn('uuid')
  product_id: string;

  @Column()
  product_name: string;

  @Column()
  quantity: number;

  @Column()
  reserved_quantity: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
