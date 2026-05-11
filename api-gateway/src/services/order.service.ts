import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  async startSaga(request: any) {
    const saga_id = uuidv4();

    try {
      this.logger.log(`Starting saga with ID: ${saga_id}`);
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.orchestratorUrl}/saga/start`,
          {
            saga_id,
            order_request: request,
          },
          { timeout: 30000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to start saga: ${error.message}`);
      throw new Error(`Failed to start saga: ${error.message}`);
    }
  }

  async getSagaStatus(saga_id: string) {
    try {
      this.logger.log(`Getting status for saga: ${saga_id}`);
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.orchestratorUrl}/saga/${saga_id}/status`,
          { timeout: 10000 },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get saga status: ${error.message}`);
      throw new Error(`Failed to get saga status: ${error.message}`);
    }
  }
}
