import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');

  // Serve the built frontend (apps/web/dist copied here at Docker build time) from the same
  // process/origin as the API, so the deployed service is a single URL. In local dev this
  // directory doesn't exist — the static middleware just never matches, no-op.
  const publicPath = join(__dirname, '..', 'public');
  if (existsSync(publicPath)) {
    app.useStaticAssets(publicPath);
    app.getHttpAdapter().get('/*splat', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(join(publicPath, 'index.html'));
    });
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
