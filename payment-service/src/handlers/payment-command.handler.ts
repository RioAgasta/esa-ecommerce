import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity, PaymentStatus } from '../entities/payment.entity';
import { v4 as uuidv4 } from 'uuid';

enum CommandType {
  CHARGE_PAYMENT = 'CHARGE_PAYMENT',
  REFUND_PAYMENT = 'REFUND_PAYMENT',
}

@Injectable()
export class PaymentCommandHandler {
  private readonly logger = new Logger(PaymentCommandHandler.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
  ) {}

  async handle(command: any) {
    this.logger.log(`📥 Handling command: ${command.command_type}`);

    try {
      switch (command.command_type) {
        case CommandType.CHARGE_PAYMENT:
          return await this.chargePayment(command);
        case CommandType.REFUND_PAYMENT:
          return await this.refundPayment(command);
        default:
          throw new Error(`Unknown command: ${command.command_type}`);
      }
    } catch (error: any) {
      this.logger.error(`❌ Command failed: ${error.message}`);
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: false,
        message: error.message,
      };
    }
  }

  private async chargePayment(command: any) {
    const existingPayment = await this.paymentRepository.findOne({
      where: { saga_id: command.saga_id },
    });

    if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
      this.logger.log(`✅ Payment already processed for saga: ${command.saga_id}`);
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: true,
        message: 'Payment already completed',
        data: { payment_id: existingPayment.payment_id },
      };
    }

    // Simulate payment processing (90% success rate)
    const success = Math.random() > 0.1;

    if (!success) {
      this.logger.error(`❌ Payment failed for saga: ${command.saga_id}`);
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: false,
        message: 'Payment processing failed',
      };
    }

    const payment = new PaymentEntity();
    payment.payment_id = uuidv4();
    payment.saga_id = command.saga_id;
    payment.order_id = command.payload.order_id;
    payment.amount = command.payload.total_amount;
    payment.status = PaymentStatus.COMPLETED;
    payment.transaction_id = uuidv4();

    const savedPayment = await this.paymentRepository.save(payment);

    this.logger.log(`✅ Payment charged: ${savedPayment.payment_id}`);

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Payment charged successfully',
      data: {
        payment_id: savedPayment.payment_id,
        transaction_id: savedPayment.transaction_id,
      },
    };
  }

  private async refundPayment(command: any) {
    const payment = await this.paymentRepository.findOne({
      where: { saga_id: command.saga_id },
    });

    if (!payment) {
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: false,
        message: 'Payment not found',
      };
    }

    if (payment.status === PaymentStatus.REFUNDED) {
      this.logger.log(`✅ Payment already refunded for saga: ${command.saga_id}`);
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: true,
        message: 'Payment already refunded',
      };
    }

    payment.status = PaymentStatus.REFUNDED;
    await this.paymentRepository.save(payment);

    this.logger.log(`✅ Payment refunded: ${payment.payment_id}`);

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Payment refunded successfully',
      data: { payment_id: payment.payment_id },
    };
  }
}
