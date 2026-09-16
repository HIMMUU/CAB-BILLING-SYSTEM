import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set security headers using Helmet
  app.use(helmet());

  app.use(cookieParser());

  // Set global prefix (excluding /health so root pings work directly)
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Enable CORS
  const frontendUrl = process.env.FRONTEND_URL;
  const corsOrigins = frontendUrl
    ? frontendUrl.split(',').map((url) => url.trim())
    : true;

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Enable global exception filter for friendly database and HTTP error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

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
void bootstrap();
