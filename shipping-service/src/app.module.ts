import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShippingCommandHandler } from './handlers/shipping-command.handler';
import { ShippingController } from './controllers/shipping.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.SHIPPING_DB_NAME || 'shipping_db',
      entities: [ShipmentEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([ShipmentEntity]),
  ],
  controllers: [ShippingController],
  providers: [ShippingCommandHandler],
})
export class AppModule {}
