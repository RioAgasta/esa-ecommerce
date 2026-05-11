import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SagaOrchestrator } from './orchestrator/saga.orchestrator';
import { SagaController } from './controllers/saga.controller';
import { SagaEntity } from './entities/saga.entity';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { CommandDispatcher } from './services/command-dispatcher.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'orchestrator_db',
      entities: [SagaEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([SagaEntity]),
    HttpModule,
  ],
  controllers: [SagaController],
  providers: [SagaOrchestrator, CircuitBreakerService, CommandDispatcher],
})
export class AppModule {}
