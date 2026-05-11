import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentCommandHandler } from './handlers/payment-command.handler';
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.PAYMENT_DB_NAME || 'payment_db',
      entities: [PaymentEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([PaymentEntity]),
  ],
  controllers: [PaymentController],
  providers: [PaymentCommandHandler],
})
export class AppModule {}
