import { Controller, Post, Body } from '@nestjs/common';
import { ShippingCommandHandler } from '../handlers/shipping-command.handler';

@Controller('command')
export class ShippingController {
  constructor(private readonly commandHandler: ShippingCommandHandler) {}

  @Post()
  async handleCommand(@Body() command: any) {
    return this.commandHandler.handle(command);
  }
}
