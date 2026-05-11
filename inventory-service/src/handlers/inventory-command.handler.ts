import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryEntity } from '../entities/inventory.entity';
import { ReservationEntity } from '../entities/reservation.entity';
import { v4 as uuidv4 } from 'uuid';

enum CommandType {
  RESERVE_STOCK = 'RESERVE_STOCK',
  RELEASE_STOCK = 'RELEASE_STOCK',
}

@Injectable()
export class InventoryCommandHandler {
  private readonly logger = new Logger(InventoryCommandHandler.name);

  constructor(
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepository: Repository<InventoryEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservationRepository: Repository<ReservationEntity>,
  ) {}

  async handle(command: any) {
    this.logger.log(`📥 Handling command: ${command.command_type}`);

    try {
      switch (command.command_type) {
        case CommandType.RESERVE_STOCK:
          return await this.reserveStock(command);
        case CommandType.RELEASE_STOCK:
          return await this.releaseStock(command);
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

  private async reserveStock(command: any) {
    const items = command.payload.items || [];

    for (const item of items) {
      let inventory = await this.inventoryRepository.findOne({
        where: { product_id: item.product_id },
      });

      if (!inventory) {
        inventory = new InventoryEntity();
        inventory.product_id = item.product_id;
        inventory.product_name = `Product ${item.product_id}`;
        inventory.quantity = 1000;
        inventory.reserved_quantity = 0;
        await this.inventoryRepository.save(inventory);
      }

      const availableQuantity =
        inventory.quantity - inventory.reserved_quantity;

      if (availableQuantity < item.quantity) {
        return {
          saga_id: command.saga_id,
          request_id: command.request_id,
          success: false,
          message: `Insufficient stock for product: ${item.product_id}`,
        };
      }

      const reservation = new ReservationEntity();
      reservation.reservation_id = uuidv4();
      reservation.saga_id = command.saga_id;
      reservation.product_id = item.product_id;
      reservation.quantity = item.quantity;

      await this.reservationRepository.save(reservation);

      inventory.reserved_quantity += item.quantity;
      await this.inventoryRepository.save(inventory);

      this.logger.log(
        `✅ Stock reserved: ${item.product_id} - ${item.quantity} units`,
      );
    }

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Stock reserved successfully',
      data: { reserved_items: items },
    };
  }

  private async releaseStock(command: any) {
    const reservations = await this.reservationRepository.find({
      where: { saga_id: command.saga_id },
    });

    for (const reservation of reservations) {
      const inventory = await this.inventoryRepository.findOne({
        where: { product_id: reservation.product_id },
      });

      if (inventory) {
        inventory.reserved_quantity = Math.max(
          0,
          inventory.reserved_quantity - reservation.quantity,
        );
        await this.inventoryRepository.save(inventory);
      }

      await this.reservationRepository.remove(reservation);

      this.logger.log(
        `✅ Stock released: ${reservation.product_id} - ${reservation.quantity} units`,
      );
    }

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Stock released successfully',
    };
  }
}
