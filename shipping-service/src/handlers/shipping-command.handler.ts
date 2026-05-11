import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentEntity, ShipmentStatus } from '../entities/shipment.entity';
import { v4 as uuidv4 } from 'uuid';

enum CommandType {
  CREATE_SHIPMENT = 'CREATE_SHIPMENT',
}

@Injectable()
export class ShippingCommandHandler {
  private readonly logger = new Logger(ShippingCommandHandler.name);

  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipmentRepository: Repository<ShipmentEntity>,
  ) {}

  async handle(command: any) {
    this.logger.log(`📥 Handling command: ${command.command_type}`);

    try {
      switch (command.command_type) {
        case CommandType.CREATE_SHIPMENT:
          return await this.createShipment(command);
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

  private async createShipment(command: any) {
    const existingShipment = await this.shipmentRepository.findOne({
      where: { saga_id: command.saga_id },
    });

    if (existingShipment && existingShipment.status === ShipmentStatus.SHIPPED) {
      this.logger.log(`✅ Shipment already created for saga: ${command.saga_id}`);
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: true,
        message: 'Shipment already created',
        data: { shipment_id: existingShipment.shipment_id },
      };
    }

    // Simulate shipping process (80% success rate)
    const success = Math.random() > 0.2;

    if (!success) {
      this.logger.error(`❌ Shipment creation failed for saga: ${command.saga_id}`);
      return {
        saga_id: command.saga_id,
        request_id: command.request_id,
        success: false,
        message: 'Shipment creation failed',
      };
    }

    const shipment = new ShipmentEntity();
    shipment.shipment_id = uuidv4();
    shipment.saga_id = command.saga_id;
    shipment.order_id = command.payload.order_id;
    shipment.status = ShipmentStatus.SHIPPED;
    shipment.tracking_number = `TRACK-${uuidv4().substring(0, 8)}`;

    const savedShipment = await this.shipmentRepository.save(shipment);

    this.logger.log(`✅ Shipment created: ${savedShipment.shipment_id}`);

    return {
      saga_id: command.saga_id,
      request_id: command.request_id,
      success: true,
      message: 'Shipment created successfully',
      data: {
        shipment_id: savedShipment.shipment_id,
        tracking_number: savedShipment.tracking_number,
      },
    };
  }
}
