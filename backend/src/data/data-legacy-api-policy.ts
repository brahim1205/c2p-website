import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '../config/config.service.js';

export type LegacyDataApiMode = 'compat' | 'read-only' | 'disabled';
export type LegacyDataOperation = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export function getLegacyDataApiMode(configService: ConfigService): LegacyDataApiMode {
  const mode = String(configService.get('DATA_LEGACY_API_MODE') ?? 'compat').trim();

  if (mode === 'read-only' || mode === 'disabled') {
    return mode;
  }

  return 'compat';
}

export function assertLegacyDataApiAllowed(
  configService: ConfigService,
  operation: LegacyDataOperation,
  table: string,
) {
  const mode = getLegacyDataApiMode(configService);

  if (mode === 'disabled') {
    throw new ForbiddenException(
      `L'API legacy /data est desactivee. Utilisez l'endpoint metier dedie pour ${table}.`,
    );
  }

  if (mode === 'read-only' && operation !== 'GET') {
    throw new ForbiddenException(
      `Les mutations legacy /data sont desactivees. Utilisez l'endpoint metier dedie pour ${table}.`,
    );
  }
}
