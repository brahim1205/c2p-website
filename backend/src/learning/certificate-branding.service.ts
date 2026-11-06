import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendAppRows, clone, patchAppRows, store, syncAppStoreFromDatabase } from '../data/data-app-store.js';
import { isValidAbsoluteUrl, trimText } from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';

const ROW_ID = 'certificate-branding';
const FIELDS = ['stamp_url', 'director_signature_url', 'director_name', 'director_title'] as const;

/** Uploaded file (`/uploads/...`) or absolute http(s) URL; empty clears the field. */
export function sanitizeAssetUrl(value: unknown, label: string) {
  const text = trimText(value);
  if (!text) return null;
  if (text.startsWith('/uploads/') || isValidAbsoluteUrl(text)) return text;
  throw new BadRequestException(`${label} : lien d image invalide.`);
}

/**
 * Official stamp (cachet) and management signature printed on every certificate. Read publicly
 * (needed to render certificates), written by administrators only.
 */
@Injectable()
export class CertificateBrandingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
  ) {}

  async get() {
    await syncAppStoreFromDatabase(this.prisma);
    const row = (store.certificate_branding ?? []).find((entry) => String(entry.id) === ROW_ID) ?? {};
    return {
      stamp_url: row.stamp_url ?? null,
      director_signature_url: row.director_signature_url ?? null,
      director_name: row.director_name ?? null,
      director_title: row.director_title ?? null,
    };
  }

  async update(payload: unknown, user: AuthUser | null) {
    if (!user || !isAdminRole(user)) throw new ForbiddenException('Reserve aux administrateurs.');
    const input = (payload && typeof payload === 'object' ? payload : {}) as Row;
    const changes: Row = {};
    for (const field of FIELDS) {
      if (!(field in input)) continue;
      if (field.endsWith('_url')) changes[field] = sanitizeAssetUrl(input[field], field === 'stamp_url' ? 'Cachet' : 'Signature');
      else {
        const text = trimText(input[field]);
        if (text && text.length > 80) throw new BadRequestException('80 caracteres maximum.');
        changes[field] = text;
      }
    }
    await syncAppStoreFromDatabase(this.prisma);
    const now = new Date().toISOString();
    const existing = (store.certificate_branding ?? []).find((entry) => String(entry.id) === ROW_ID);
    const before = existing ? [clone(existing)] : [];
    const rows = existing
      ? patchAppRows('certificate_branding', (entry) => String(entry.id) === ROW_ID, { ...changes, updated_at: now, updated_by: user.id })
      : appendAppRows('certificate_branding', [{ id: ROW_ID, ...changes, created_at: now, updated_at: now, updated_by: user.id }]);
    await this.platformPersistenceService.persistRows({ certificate_branding: rows }, {
      actorId: user.id,
      reason: 'admin:certificate-branding:update',
      beforeRowsByTable: before.length ? { certificate_branding: before } : {},
      afterRowsByTable: { certificate_branding: rows },
    });
    return this.get();
  }
}
