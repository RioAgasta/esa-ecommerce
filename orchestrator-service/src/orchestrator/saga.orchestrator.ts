import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SagaEntity, SagaStateEnum } from '../entities/saga.entity';
import { CommandDispatcher } from '../services/command-dispatcher.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { v4 as uuidv4 } from 'uuid';

enum CommandType {
  CREATE_ORDER = 'CREATE_ORDER',
  RESERVE_STOCK = 'RESERVE_STOCK',
  CHARGE_PAYMENT = 'CHARGE_PAYMENT',
  CREATE_SHIPMENT = 'CREATE_SHIPMENT',
  RELEASE_STOCK = 'RELEASE_STOCK',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
  CANCEL_ORDER = 'CANCEL_ORDER',
}

@Injectable()
export class SagaOrchestrator {
  private readonly logger = new Logger(SagaOrchestrator.name);

  constructor(
    @InjectRepository(SagaEntity)
    private readonly sagaRepository: Repository<SagaEntity>,
    private readonly commandDispatcher: CommandDispatcher,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async startSaga(saga_id: string, order_request: any) {
    this.logger.log(`🚀 Starting saga: ${saga_id}`);

    const saga = new SagaEntity();
    saga.saga_id = saga_id;
    saga.order_id = uuidv4();
    saga.current_state = SagaStateEnum.INIT;
    saga.step_history = [];
    saga.retry_count = {};
    saga.order_data = order_request;

    await this.sagaRepository.save(saga);

    try {
      await this.executeStep(saga_id, CommandType.CREATE_ORDER, order_request);
    } catch (error: any) {
      this.logger.error(`❌ Saga failed: ${error.message}`);
      await this.compensate(saga_id);
    }

    return { saga_id, status: 'started' };
  }

  async executeStep(saga_id: string, commandType: CommandType, payload: any) {
    const saga = await this.sagaRepository.findOne({ where: { saga_id } });
    if (!saga) {
      throw new Error(`Saga not found: ${saga_id}`);
    }

    const command = {
      saga_id,
      request_id: uuidv4(),
      command_type: commandType,
      timestamp: new Date(),
      payload,
    };

    try {
      const response = await this.dispatchCommandWithRetry(command, saga);

      if (!response.success) {
        this.logger.error(`❌ Command failed: ${commandType}`);
        throw new Error(`Command failed: ${response.message}`);
      }

      await this.recordStep(saga_id, commandType);
      await this.executeNextStep(saga_id, commandType, response.data);
    } catch (error: any) {
      this.logger.error(`❌ Step execution failed: ${error.message}`);
      throw error;
    }
  }

  // FIX BUG 7: Use an explicit attempt counter instead of reading from the
  // entity on every recursive call, which caused the limit to never be reached
  // when retrying within a single executeStep invocation.
  private async dispatchCommandWithRetry(
    command: any,
    saga: SagaEntity,
    attempt = 0,
    maxRetries = 3,
  ) {
    if (attempt >= maxRetries) {
      throw new Error(`Max retries (${maxRetries}) exceeded for ${command.command_type}`);
    }

    try {
      const response = await this.circuitBreaker.executeWithFallback(
        command.command_type,
        () => this.commandDispatcher.dispatch(command),
      );
      return response;
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Retry attempt ${attempt + 1}/${maxRetries} for ${command.command_type}`,
      );
      saga.retry_count[command.command_type] =
        (saga.retry_count[command.command_type] || 0) + 1;
      await this.sagaRepository.save(saga);

      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.dispatchCommandWithRetry(command, saga, attempt + 1, maxRetries);
    }
  }

  private async executeNextStep(
    saga_id: string,
    currentStep: CommandType,
    responseData: any,
  ) {
    const nextStep = this.getNextStep(currentStep);

    if (nextStep) {
      await this.executeStep(saga_id, nextStep, responseData);
    } else {
      await this.completeSaga(saga_id);
    }
  }

  private getNextStep(currentStep: CommandType): CommandType | null {
    const stepSequence = [
      CommandType.CREATE_ORDER,
      CommandType.RESERVE_STOCK,
      CommandType.CHARGE_PAYMENT,
      CommandType.CREATE_SHIPMENT,
    ];

    const currentIndex = stepSequence.indexOf(currentStep);
    return stepSequence[currentIndex + 1] || null;
  }

  async compensate(saga_id: string) {
    this.logger.log(`↩️ Starting compensation for saga: ${saga_id}`);

    const saga = await this.sagaRepository.findOne({ where: { saga_id } });
    if (!saga) {
      throw new Error(`Saga not found: ${saga_id}`);
    }

    // FIX BUG 6: Snapshot the state BEFORE overwriting it so the
    // compensationMap lookup uses the correct pre-failure state.
    const stateBeforeCompensation = saga.current_state;

    saga.current_state = SagaStateEnum.COMPENSATING;
    await this.sagaRepository.save(saga);

    const compensationMap: Partial<Record<SagaStateEnum, CommandType[]>> = {
      [SagaStateEnum.ORDER_CREATED]: [CommandType.CANCEL_ORDER],
      [SagaStateEnum.STOCK_RESERVED]: [
        CommandType.RELEASE_STOCK,
        CommandType.CANCEL_ORDER,
      ],
      [SagaStateEnum.PAYMENT_COMPLETED]: [
        CommandType.REFUND_PAYMENT,
        CommandType.RELEASE_STOCK,
        CommandType.CANCEL_ORDER,
      ],
      [SagaStateEnum.SHIPPING_CREATED]: [
        CommandType.REFUND_PAYMENT,
        CommandType.RELEASE_STOCK,
        CommandType.CANCEL_ORDER,
      ],
    };

    const compensationSteps = compensationMap[stateBeforeCompensation] || [];

    for (const compensationStep of compensationSteps) {
      try {
        const command = {
          saga_id,
          request_id: uuidv4(),
          command_type: compensationStep,
          timestamp: new Date(),
          payload: saga.order_data,
        };

        await this.commandDispatcher.dispatch(command);
        this.logger.log(`✅ Compensation step completed: ${compensationStep}`);
      } catch (error: any) {
        this.logger.error(
          `❌ Compensation step failed: ${compensationStep} - ${error.message}`,
        );
      }
    }

    saga.current_state = SagaStateEnum.FAILED;
    await this.sagaRepository.save(saga);
  }

  private async recordStep(saga_id: string, step: CommandType) {
    const saga = await this.sagaRepository.findOne({ where: { saga_id } });
    const stateMap = {
      [CommandType.CREATE_ORDER]: SagaStateEnum.ORDER_CREATED,
      [CommandType.RESERVE_STOCK]: SagaStateEnum.STOCK_RESERVED,
      [CommandType.CHARGE_PAYMENT]: SagaStateEnum.PAYMENT_COMPLETED,
      [CommandType.CREATE_SHIPMENT]: SagaStateEnum.SHIPPING_CREATED,
    };

    saga.step_history.push({
      step,
      state: stateMap[step],
      timestamp: new Date(),
      command_id: uuidv4(),
    });
    saga.current_state = stateMap[step];
    await this.sagaRepository.save(saga);
  }

  private async completeSaga(saga_id: string) {
    this.logger.log(`✅ Saga completed: ${saga_id}`);
    const saga = await this.sagaRepository.findOne({ where: { saga_id } });
    saga.current_state = SagaStateEnum.COMPLETED;
    await this.sagaRepository.save(saga);
  }

  async getSagaStatus(saga_id: string) {
    const saga = await this.sagaRepository.findOne({ where: { saga_id } });
    return saga;
  }
}
