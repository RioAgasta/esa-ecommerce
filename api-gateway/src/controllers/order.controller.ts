import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrderService } from '../services/order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  async checkout(@Body() request: any) {
    return this.orderService.startSaga(request);
  }

  @Get('saga/:saga_id')
  async getSagaStatus(@Param('saga_id') saga_id: string) {
    return this.orderService.getSagaStatus(saga_id);
  }
}
