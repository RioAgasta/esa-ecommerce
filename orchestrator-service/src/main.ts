import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('saga');
  await app.listen(3001);
  console.log('🚀 Orchestrator Service running on port 3001');
}

bootstrap();
