import { ConflictException } from '@nestjs/common';
import type { Row, Store } from './mock-store.js';

export interface DataWritePolicyContext {
  store: Store;
  getDefaultLiveProvider: () => string;
  getPlatformRuleNumber: (ruleId: string, fallback: number) => number;
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addDaysIso(base: string | Date | number, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export function prepareInsert(
  table: string,
  row: Row,
  context: DataWritePolicyContext,
): Row {
  const now = new Date().toISOString();
  const { store } = context;

  if (table === 'course_enrollments') {
    return {
      progress: 0,
      status: 'active',
      enrolled_at: now,
      last_active: now,
      grade: null,
      ...row,
    };
  }

  if (table === 'lesson_progress') {
    return {
      progress: 0,
      completed: false,
      status: 'not_started',
      first_viewed_at: now,
      last_viewed_at: now,
      completed_at: null,
      ...row,
    };
  }

  if (table === 'course_reviews') {
    return {
      status: 'published',
      ...row,
    };
  }

  if (table === 'provider_reviews') {
    return {
      helpful: 0,
      response: null,
      ...row,
    };
  }

  if (table === 'notifications') {
    return {
      is_read: false,
      metadata: {},
      ...row,
    };
  }

  if (table === 'bookings') {
    return {
      request_type: 'booking',
      payment_method: 'wallet',
      booking_time: '09:00',
      status: 'pending',
      provider_id: null,
      requested_provider_id: null,
      requested_provider_name: null,
      request_channel: 'c2p_managed',
      assignment_status: 'pending_review',
      assigned_by_c2p: null,
      assigned_at: null,
      wallet_flow: 'escrow',
      commission_rate: context.getPlatformRuleNumber('commission_rate', 15),
      platform_fee_amount: null,
      provider_payout_amount: null,
      ...row,
    };
  }

  if (table === 'admin_reports') {
    return {
      status: 'pending',
      priority: 'medium',
      adminAction: null,
      date: now,
      ...row,
    };
  }

  if (table === 'messages') {
    return {
      read: false,
      attachments: [],
      ...row,
    };
  }

  if (table === 'projects') {
    return {
      status: 'pre-incubation',
      phase: 'idee',
      funding: 0,
      team_size: 1,
      mentors: 0,
      progress: 0,
      looking_for: [],
      ...row,
    };
  }

  if (table === 'project_funding_rounds') {
    return {
      raised_amount: 0,
      status: 'en_cours',
      pitch_deck: false,
      business_plan: false,
      ...row,
    };
  }

  if (table === 'project_collaborations') {
    return {
      meetings: 0,
      deliverables: [],
      status: 'en_negociation',
      ...row,
    };
  }

  if (table === 'project_tracking') {
    return {
      status: 'actif',
      invested_amount: 0,
      roi: 0,
      ...row,
    };
  }

  if (table === 'course_sections') {
    const existingPositions = (store.course_sections ?? [])
      .filter((section) => String(section.course_id) === String(row.course_id))
      .map((section) => toNumber(section.position) ?? 0);
    return {
      status: 'draft',
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'course_lessons') {
    const existingPositions = (store.course_lessons ?? [])
      .filter((lesson) => String(lesson.section_id) === String(row.section_id))
      .map((lesson) => toNumber(lesson.position) ?? 0);
    return {
      status: 'draft',
      is_preview: false,
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'lesson_assets') {
    const existingPositions = (store.lesson_assets ?? [])
      .filter((asset) => String(asset.lesson_id) === String(row.lesson_id))
      .map((asset) => toNumber(asset.position) ?? 0);
    return {
      status: 'ready',
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      size_bytes: null,
      thumbnail_url: null,
      mime_type: null,
      ...row,
    };
  }

  if (table === 'quiz_questions') {
    const existingPositions = (store.quiz_questions ?? [])
      .filter((question) => String(question.exam_id) === String(row.exam_id))
      .map((question) => toNumber(question.position) ?? 0);
    return {
      required: true,
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      explanation: '',
      ...row,
    };
  }

  if (table === 'quiz_choices') {
    const existingPositions = (store.quiz_choices ?? [])
      .filter((choice) => String(choice.question_id) === String(row.question_id))
      .map((choice) => toNumber(choice.position) ?? 0);
    return {
      is_correct: false,
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'lesson_comments') {
    return {
      status: 'visible',
      likes: 0,
      pinned: false,
      parent_id: null,
      ...row,
    };
  }

  if (table === 'course_faq_items') {
    const existingPositions = (store.course_faq_items ?? [])
      .filter((item) => String(item.course_id) === String(row.course_id))
      .map((item) => toNumber(item.position) ?? 0);
    return {
      status: 'draft',
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'wallet_accounts') {
    return {
      balance: 0,
      currency: 'XAF',
      updated_at: now,
      ...row,
    };
  }

  if (table === 'payout_accounts') {
    return {
      status: 'active',
      is_default: false,
      ...row,
    };
  }

  if (table === 'payout_requests') {
    return {
      status: 'pending',
      currency: 'XAF',
      requested_at: now,
      processed_at: null,
      ...row,
    };
  }

  if (table === 'subscription_plans') {
    return {
      currency: 'XAF',
      price_monthly: 0,
      commission_rate: 0,
      features: [],
      active: true,
      ...row,
    };
  }

  if (table === 'user_subscriptions') {
    return {
      status: 'pending',
      currency: 'XAF',
      auto_renew: true,
      started_at: now,
      renews_at: addDaysIso(now, 30),
      last_billed_at: now,
      ...row,
    };
  }

  if (table === 'provider_visibility_passes') {
    return {
      status: 'active',
      pass_tier: 'standard',
      pass_label: 'Billet standard',
      alerts_enabled: false,
      verification_eligible: false,
      matching_priority: 'low',
      issued_at: now,
      expires_at: addDaysIso(now, 30),
      superseded_at: null,
      ...row,
    };
  }

  if (table === 'provider_verification_requests') {
    return {
      status: 'pending',
      requested_level: 'verified',
      source: 'self_service',
      requested_at: now,
      reviewed_at: null,
      reviewed_by: null,
      admin_notes: null,
      note: '',
      ...row,
    };
  }

  if (table === 'escrow_cases') {
    return {
      status: 'awaiting_funding',
      currency: 'XAF',
      funded_at: null,
      released_at: null,
      refunded_at: null,
      note: null,
      payment_transaction_id: null,
      refund_transaction_id: null,
      payout_transaction_id: null,
      ...row,
    };
  }

  if (table === 'commission_ledger') {
    return {
      currency: 'XAF',
      status: 'recognized',
      recognized_at: now,
      ...row,
    };
  }

  if (table === 'virtual_classes') {
    return {
      provider: context.getDefaultLiveProvider(),
      recording_enabled: true,
      allow_chat: true,
      recording_status: 'pending',
      started_at: null,
      ended_at: null,
      instructor_notes: null,
      ...row,
    };
  }

  return row;
}

export function ensureConstraints(table: string, rows: Row[], store: Store) {
  for (const row of rows) {
    if (table === 'course_enrollments') {
      const duplicate = (store.course_enrollments ?? []).find(
        (existing) =>
          String(existing.course_id) === String(row.course_id) &&
          String(existing.student_id) === String(row.student_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate enrollment');
      }
    }

    if (table === 'lesson_progress') {
      const duplicate = (store.lesson_progress ?? []).find(
        (existing) =>
          String(existing.lesson_id) === String(row.lesson_id) &&
          String(existing.student_id) === String(row.student_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate lesson progress');
      }
    }

    if (table === 'course_reviews') {
      const duplicate = (store.course_reviews ?? []).find(
        (existing) =>
          String(existing.course_id) === String(row.course_id) &&
          String(existing.student_id) === String(row.student_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate course review');
      }
    }

    if (table === 'project_tracking') {
      const duplicate = (store.project_tracking ?? []).find(
        (existing) =>
          String(existing.project_id) === String(row.project_id) &&
          String(existing.partner_id) === String(row.partner_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate tracking');
      }
    }

    if (table === 'client_favorites') {
      const duplicate = (store.client_favorites ?? []).find(
        (existing) =>
          String(existing.client_id) === String(row.client_id) &&
          String(existing.provider_id) === String(row.provider_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate favorite');
      }
    }

    if (table === 'submissions') {
      const duplicate = (store.submissions ?? []).find(
        (existing) =>
          String(existing.exam_id) === String(row.exam_id) &&
          String(existing.student_id) === String(row.student_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate submission');
      }
    }

    if (table === 'wallet_accounts') {
      const duplicate = (store.wallet_accounts ?? []).find(
        (existing) => String(existing.user_id) === String(row.user_id),
      );
      if (duplicate) {
        throw new ConflictException('duplicate wallet');
      }
    }

    if (table === 'user_subscriptions') {
      const duplicate = (store.user_subscriptions ?? []).find(
        (existing) =>
          String(existing.user_id) === String(row.user_id) &&
          String(existing.role ?? existing.plan_role ?? '') === String(row.role ?? ''),
      );
      if (duplicate) {
        throw new ConflictException('duplicate subscription');
      }
    }

    if (table === 'provider_verification_requests') {
      const duplicate = (store.provider_verification_requests ?? []).find(
        (existing) =>
          String(existing.provider_id) === String(row.provider_id)
          && String(existing.user_id) === String(row.user_id)
          && new Set(['pending', 'in_review']).has(String(existing.status ?? 'pending')),
      );
      if (duplicate) {
        throw new ConflictException('duplicate verification request');
      }
    }
  }
}
