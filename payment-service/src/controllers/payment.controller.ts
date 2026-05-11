import { Controller, Post, Body } from '@nestjs/common';
import { PaymentCommandHandler } from '../handlers/payment-command.handler';

@Controller('command')
export class PaymentController {
  constructor(private readonly commandHandler: PaymentCommandHandler) {}

  @Post()
  async handleCommand(@Body() command: any) {
    return this.commandHandler.handle(command);
  }
}
