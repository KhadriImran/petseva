import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from './audit.service';
import { EventsService } from './events.service';
import { NumberingService } from './numbering.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtSecret(),
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '12h') as any },
    }),
  ],
  providers: [AuditService, EventsService, NumberingService],
  exports: [AuditService, EventsService, NumberingService, JwtModule],
})
export class CommonModule {}

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) throw new Error('JWT_SECRET env var must be set (at least 16 random characters)');
  return s ?? 'dev-secret-change-me';
}
