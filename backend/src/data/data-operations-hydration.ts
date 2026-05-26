import { findUserById } from '../auth/auth.store.js';
import { findRow } from './data-app-store.js';
import {
  buildJitsiRoomUrl,
  getDefaultLiveProvider,
  normalizeMeetingSlug,
  parseBoolean,
  trimText,
} from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function hydrateOperationsRow(table: string, hydrated: Row) {
  if (table === 'commission_ledger') {
    const actor = findUserById(String(hydrated.user_id ?? ''));
    const beneficiary = findUserById(String(hydrated.beneficiary_user_id ?? ''));
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.status = hydrated.status ?? 'recognized';
    hydrated.actor_name = actor ? `${actor.firstName} ${actor.lastName}`.trim() : hydrated.actor_name ?? null;
    hydrated.beneficiary_name = beneficiary ? `${beneficiary.firstName} ${beneficiary.lastName}`.trim() : hydrated.beneficiary_name ?? null;
    return hydrated;
  }

  if (table === 'payout_accounts') {
    hydrated.is_default = Boolean(hydrated.is_default);
    hydrated.status = hydrated.status ?? 'active';
    return hydrated;
  }

  if (table === 'payout_requests') {
    const account = findRow('payout_accounts', hydrated.account_id);
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.account_label = hydrated.account_label ?? account?.label ?? null;
    hydrated.account_identifier = hydrated.account_identifier ?? account?.account_identifier ?? null;
    hydrated.status = hydrated.status ?? 'pending';
    return hydrated;
  }

  if (table === 'virtual_classes') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.provider = hydrated.provider ?? getDefaultLiveProvider();
    hydrated.meeting_slug = hydrated.meeting_slug ?? normalizeMeetingSlug(
      hydrated.meeting_slug,
      [hydrated.course_name, hydrated.title, hydrated.class_date, hydrated.class_time],
    );
    hydrated.room_link = hydrated.room_link ?? (hydrated.provider === 'jitsi'
      ? buildJitsiRoomUrl(String(hydrated.meeting_slug))
      : null);
    hydrated.recording_enabled = parseBoolean(hydrated.recording_enabled, true);
    hydrated.allow_chat = parseBoolean(hydrated.allow_chat, true);
    hydrated.instructor_notes = trimText(hydrated.instructor_notes);
    hydrated.started_at = hydrated.started_at ?? null;
    hydrated.ended_at = hydrated.ended_at ?? null;
    hydrated.recording_status = hydrated.recording_url
      ? 'ready'
      : hydrated.recording_enabled
        ? (hydrated.status === 'ended' ? 'processing' : 'pending')
        : 'none';
    hydrated.replay_available = Boolean(hydrated.recording_url) || hydrated.recording_status === 'ready';
    return hydrated;
  }

  return null;
}
