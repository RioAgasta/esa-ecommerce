import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { SagaOrchestrator } from '../orchestrator/saga.orchestrator';

@Controller()
export class SagaController {
  constructor(private readonly sagaOrchestrator: SagaOrchestrator) {}

  @Post('start')
  async startSaga(@Body() body: { saga_id: string; order_request: any }) {
    return this.sagaOrchestrator.startSaga(body.saga_id, body.order_request);
  }

  @Get(':saga_id/status')
  async getSagaStatus(@Param('saga_id') saga_id: string) {
    return this.sagaOrchestrator.getSagaStatus(saga_id);
  }
}
