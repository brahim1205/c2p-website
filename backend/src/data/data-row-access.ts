import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';
import { ADMIN_ONLY_TABLES, canReadWithoutAuth } from './data-access-policy.js';
import { isConversationAllowedForActor } from './data-messaging-policy.js';

export interface DataRowAccessContext {
  findRow: (table: string, rowId: unknown) => Row | undefined;
  findUserById: (userId: string) => AuthUser | null | undefined;
  getProviderIdsForUser: (userId: string) => string[];
  getInstructorCourseIds: (userId: string) => string[];
  getStudentCourseIds: (userId: string) => string[];
  getLinkedStudentIdsForParent: (userId: string) => string[];
  getLessonIdsForCourses: (courseIds: string[]) => string[];
  getOwnerProjectIds: (userId: string) => string[];
  getTrackedProjectIds: (userId: string) => string[];
  getConversationIdsForUser: (userId: string) => string[];
}

export function filterRowsForActor(
  table: string,
  rows: Row[],
  user: AuthUser | null,
  ctx: DataRowAccessContext,
) {
  if (!user) {
    if (!canReadWithoutAuth(table)) {
      return [];
    }
    if (table === 'courses') {
      return rows.filter((row) => String(row.status ?? 'draft') === 'published');
    }
    if (table === 'course_sections') {
      return rows.filter((row) => {
        const course = ctx.findRow('courses', row.course_id);
        return String(row.status ?? 'draft') === 'published' && String(course?.status ?? 'draft') === 'published';
      });
    }
    if (table === 'course_lessons') {
      return rows.filter((row) => {
        const course = ctx.findRow('courses', row.course_id);
        return String(row.status ?? 'draft') === 'published' && String(course?.status ?? 'draft') === 'published';
      });
    }
    if (table === 'course_reviews') {
      return rows.filter((row) => {
        const course = ctx.findRow('courses', row.course_id);
        return String(row.status ?? 'published') === 'published' && String(course?.status ?? 'draft') === 'published';
      });
    }
    if (table === 'virtual_classes') {
      return rows.filter((row) => {
        const course = ctx.findRow('courses', row.course_id);
        const status = String(row.status ?? 'scheduled');
        return String(course?.status ?? 'draft') === 'published' && status !== 'cancelled';
      });
    }
    return rows;
  }

  if (isAdminRole(user)) {
    return rows;
  }

  const providerIds = ctx.getProviderIdsForUser(user.id);
  const courseIds = ctx.getInstructorCourseIds(user.id);
  const studentCourseIds = ctx.getStudentCourseIds(user.id);
  const linkedStudentIds = ctx.getLinkedStudentIdsForParent(user.id);
  const lessonIds = ctx.getLessonIdsForCourses(user.role === 'formateur' ? courseIds : studentCourseIds);
  const ownerProjectIds = ctx.getOwnerProjectIds(user.id);
  const trackedProjectIds = ctx.getTrackedProjectIds(user.id);
  const conversationIds = ctx.getConversationIdsForUser(user.id);

  switch (table) {
    case 'providers':
    case 'projects':
      return rows;
    case 'courses':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.instructor_id) === user.id);
      }
      return rows;
    case 'course_sections':
    case 'course_lessons':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'lesson_assets':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)) || lessonIds.includes(String(row.lesson_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)) || lessonIds.includes(String(row.lesson_id)));
      }
      return [];
    case 'lesson_comments':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'lesson_progress':
    case 'course_quiz_attempts':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'parent') {
        return rows.filter((row) => linkedStudentIds.includes(String(row.student_id)));
      }
      return [];
    case 'course_wizard_drafts':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.user_id) === user.id);
      }
      return [];
    case 'course_reviews':
      if (user.role === 'apprenant') {
        return rows.filter((row) => {
          const isPublished = String(row.status ?? 'published') === 'published';
          const isOwner = String(row.student_id) === user.id;
          return isPublished || isOwner;
        });
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      return rows.filter((row) => String(row.status ?? 'published') === 'published');
    case 'course_faq_items':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'virtual_classes':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.instructor_id) === user.id || courseIds.includes(String(row.course_id)));
      }
      return rows;
    case 'notifications':
    case 'payment_transactions':
    case 'wallet_accounts':
    case 'invoices':
    case 'payout_accounts':
    case 'payout_requests':
    case 'provider_visibility_orders':
    case 'user_subscriptions':
    case 'provider_visibility_passes':
      return rows.filter((row) => String(row.user_id) === user.id);
    case 'subscription_plans':
    case 'provider_visibility_products':
      return rows.filter((row) => Boolean(row.active ?? true));
    case 'escrow_cases':
      if (user.role === 'client') {
        return rows.filter((row) => String(row.client_id) === user.id);
      }
      if (user.role === 'prestataire') {
        return rows.filter((row) => String(row.provider_user_id) === user.id);
      }
      return [];
    case 'commission_ledger':
      if (new Set(['prestataire', 'formateur', 'porteur']).has(user.role)) {
        return rows.filter((row) => String(row.user_id) === user.id);
      }
      return [];
    case 'client_orders':
    case 'client_favorites':
      return rows.filter((row) => String(row.client_id) === user.id);
    case 'bookings':
      if (user.role === 'client') {
        return rows.filter((row) => String(row.client_id) === user.id);
      }
      if (user.role === 'prestataire') {
        return rows.filter((row) => providerIds.includes(String(row.provider_id)));
      }
      return [];
    case 'provider_services':
      if (user.role === 'prestataire') {
        return rows.filter((row) => providerIds.includes(String(row.provider_id)));
      }
      return rows;
    case 'provider_verification_requests':
      if (user.role === 'prestataire') {
        return rows.filter((row) =>
          providerIds.includes(String(row.provider_id))
          || String(row.user_id) === user.id,
        );
      }
      return [];
    case 'provider_reviews':
      if (user.role === 'client') {
        return rows.filter((row) => String(row.client_id) === user.id);
      }
      if (user.role === 'prestataire') {
        return rows.filter((row) => providerIds.includes(String(row.provider_id)));
      }
      return rows;
    case 'course_enrollments':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'parent') {
        return rows.filter((row) => linkedStudentIds.includes(String(row.student_id)));
      }
      return [];
    case 'student_guardians':
      if (user.role === 'parent') {
        return rows.filter((row) => String(row.parent_id) === user.id);
      }
      return [];
    case 'exams':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.instructor_id) === user.id || courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'quiz_questions':
      if (user.role === 'formateur') {
        return rows.filter((row) => {
          const exam = ctx.findRow('exams', row.exam_id);
          return exam ? (String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id))) : false;
        });
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => {
          const exam = ctx.findRow('exams', row.exam_id);
          return exam ? studentCourseIds.includes(String(exam.course_id)) : false;
        });
      }
      return [];
    case 'quiz_choices':
      if (user.role === 'formateur') {
        return rows.filter((row) => {
          const question = ctx.findRow('quiz_questions', row.question_id);
          const exam = question ? ctx.findRow('exams', question.exam_id) : ctx.findRow('exams', row.exam_id);
          return exam ? (String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id))) : false;
        });
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => {
          const question = ctx.findRow('quiz_questions', row.question_id);
          const exam = question ? ctx.findRow('exams', question.exam_id) : ctx.findRow('exams', row.exam_id);
          return exam ? studentCourseIds.includes(String(exam.course_id)) : false;
        });
      }
      return [];
    case 'submissions':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => {
          const exam = ctx.findRow('exams', row.exam_id);
          return exam ? (String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id))) : false;
        });
      }
      return [];
    case 'certificates':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'parent') {
        return rows.filter((row) => linkedStudentIds.includes(String(row.student_id)));
      }
      return [];
    case 'conversations':
      return rows.filter((row) => isConversationAllowedForActor(user, row.participants, ctx.findUserById));
    case 'messages':
      return rows.filter((row) => {
        if (!conversationIds.includes(String(row.conversation_id))) {
          return false;
        }
        const conversation = ctx.findRow('conversations', row.conversation_id);
        return conversation ? isConversationAllowedForActor(user, conversation.participants, ctx.findUserById) : false;
      });
    case 'project_milestones':
    case 'project_documents':
    case 'project_history':
    case 'project_partnerships':
    case 'project_funding_rounds':
      if (user.role === 'porteur') {
        return rows.filter((row) => ownerProjectIds.includes(String(row.project_id)));
      }
      if (user.role === 'partenaire') {
        return rows.filter((row) => trackedProjectIds.includes(String(row.project_id)));
      }
      return [];
    case 'funding_investors':
      if (user.role === 'porteur' || user.role === 'partenaire') {
        return rows.filter((row) => {
          const round = ctx.findRow('project_funding_rounds', row.funding_round_id);
          return round
            ? (user.role === 'porteur'
              ? ownerProjectIds.includes(String(round.project_id))
              : trackedProjectIds.includes(String(round.project_id)))
            : false;
        });
      }
      return [];
    case 'project_tracking':
    case 'project_collaborations':
      if (user.role === 'partenaire') {
        return rows.filter((row) => String(row.partner_id) === user.id);
      }
      if (user.role === 'porteur') {
        return rows.filter((row) => ownerProjectIds.includes(String(row.project_id)));
      }
      return [];
    default:
      return [];
  }
}
