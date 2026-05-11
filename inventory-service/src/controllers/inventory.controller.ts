import { Controller, Post, Body } from '@nestjs/common';
import { InventoryCommandHandler } from '../handlers/inventory-command.handler';

@Controller('command')
export class InventoryController {
  constructor(private readonly commandHandler: InventoryCommandHandler) {}

  @Post()
  async handleCommand(@Body() command: any) {
    return this.commandHandler.handle(command);
  }
}
