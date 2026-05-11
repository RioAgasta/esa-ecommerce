import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryEntity } from './entities/inventory.entity';
import { ReservationEntity } from './entities/reservation.entity';
import { InventoryCommandHandler } from './handlers/inventory-command.handler';
import { InventoryController } from './controllers/inventory.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.INVENTORY_DB_NAME || 'inventory_db',
      entities: [InventoryEntity, ReservationEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([InventoryEntity, ReservationEntity]),
  ],
  controllers: [InventoryController],
  providers: [InventoryCommandHandler],
})
export class AppModule {}
