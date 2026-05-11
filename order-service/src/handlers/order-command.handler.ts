import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderEntity, OrderStatus } from '../entities/order.entity';
import { v4 as uuidv4 } from 'uuid';

enum CommandType {
  CREATE_ORDER = 'CREATE_ORDER',
  CANCEL_ORDER = 'CANCEL_ORDER',
}

@Injectable()
export class OrderCommandHandler {
  private readonly logger = new Logger(OrderCommandHandler.name);

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
  ) {}

  async handle(command: any) {
    this.logger.log(`📥 Handling command: ${command.command_type}`);

    try {
      switch (command.command_type) {
        case CommandType.CREATE_ORDER:
          return await this.createOrder(command);
        case CommandType.CANCEL_ORDER:
          return await this.cancelOrder(command);
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

  private async createOrder(command: any) {
    const order = new OrderEntity();
    order.order_id = uuidv4();
    order.saga_id = command.saga_id;
    order.user_id = command.payload.user_id;
    order.total_amount = command.payload.total_amount;
    order.items = command.payload.items;
    order.status = OrderStatus.PENDING;

    const savedOrder = await this.orderRepository.save(order);

    this.logger.log(`✅ Order created: ${savedOrder.order_id}`);

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Order created successfully',
      data: {
        order_id: savedOrder.order_id,
        status: savedOrder.status,
      },
    };
  }

  private async cancelOrder(command: any) {
    const order = await this.orderRepository.findOne({
      where: { saga_id: command.saga_id },
    });

    if (!order) {
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: false,
        message: 'Order not found',
      };
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    this.logger.log(`✅ Order cancelled: ${order.order_id}`);

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Order cancelled successfully',
      data: { order_id: order.order_id },
    };
  }
}
