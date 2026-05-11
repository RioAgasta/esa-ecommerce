import { Controller, Post, Body } from '@nestjs/common';
import { OrderCommandHandler } from '../handlers/order-command.handler';

@Controller('command')
export class OrderController {
  constructor(private readonly commandHandler: OrderCommandHandler) {}

  @Post()
  async handleCommand(@Body() command: any) {
    return this.commandHandler.handle(command);
  }
}
