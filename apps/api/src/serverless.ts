import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * Vercel serverless entry (see /api/index.js + vercel.json). The Nest app is created once per warm
 * function instance and reused across requests. The POS is served from the same domain, so no CORS.
 */
let app: Promise<Handler> | null = null;

async function create(): Promise<Handler> {
  const nest = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });
  nest.setGlobalPrefix('api');
  if (process.env.CORS_ORIGIN) nest.enableCors({ origin: process.env.CORS_ORIGIN.split(','), credentials: true });
  nest.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: false }));
  await nest.init();
  return nest.getHttpAdapter().getInstance();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  app ??= create();
  try {
    (await app)(req, res);
  } catch (e) {
    app = null; // retry the boot on the next request (e.g. DB was waking up)
    console.error('[api] boot failed', e);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ message: e instanceof Error ? e.message : 'Server failed to start' }));
  }
}
