import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend server is running on: http://localhost:${port}/api/v1`);
}
bootstrap();

