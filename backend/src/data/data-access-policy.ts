export type DataRequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export const PUBLIC_READ_TABLES = new Set([
  'providers',
  'provider_services',
  'provider_reviews',
  'courses',
  'course_sections',
  'course_lessons',
  'course_reviews',
  'virtual_classes',
  'projects',
  'project_milestones',
  'project_documents',
  'project_history',
  'project_partnerships',
  'project_funding_rounds',
  'funding_investors',
]);

export const ADMIN_ONLY_TABLES = new Set([
  'admin_accreditations',
  'admin_content_items',
  'admin_campaigns',
  'admin_reports',
  'admin_platform_categories',
  'admin_platform_rules',
  'admin_integrations',
  'admin_backups',
  'admin_security_alerts',
  'admin_audit_logs',
  'auth_users',
  'auth_sessions',
]);

export const APPEND_ONLY_TABLES = new Set([
  'payment_transactions',
  'commission_ledger',
]);

const PROVIDER_CATALOG_TABLES = new Set([
  'providers',
  'provider_services',
  'provider_verification_requests',
]);

const REVIEW_TABLES = new Set([
  'provider_reviews',
]);

const MARKETPLACE_TABLES = new Set([
  'bookings',
  'client_orders',
  'client_favorites',
]);

const FINANCE_TABLES = new Set([
  'payment_transactions',
  'wallet_accounts',
  'invoices',
  'payout_accounts',
  'payout_requests',
  'commission_ledger',
  'escrow_cases',
  'provider_visibility_orders',
]);

const SUBSCRIPTION_TABLES = new Set([
  'subscription_plans',
  'user_subscriptions',
  'provider_visibility_passes',
  'provider_visibility_products',
]);

const LEARNING_TABLES = new Set([
  'courses',
  'course_sections',
  'course_lessons',
  'lesson_assets',
  'virtual_classes',
  'student_guardians',
  'course_enrollments',
  'lesson_progress',
  'course_reviews',
  'exams',
  'quiz_questions',
  'quiz_choices',
  'submissions',
  'certificates',
  'lesson_comments',
  'course_faq_items',
]);

const MESSAGING_TABLES = new Set([
  'conversations',
  'messages',
]);

const NOTIFICATION_TABLES = new Set([
  'notifications',
]);

const PROJECT_TABLES = new Set([
  'projects',
  'project_milestones',
  'project_documents',
  'project_history',
  'project_partnerships',
  'project_funding_rounds',
  'funding_investors',
  'project_tracking',
  'project_collaborations',
]);

export function canReadWithoutAuth(table: string) {
  return PUBLIC_READ_TABLES.has(table);
}

function permissionPair(method: DataRequestMethod, readPermission: string, writePermission: string) {
  return method === 'GET' ? readPermission : writePermission;
}

export function getRequiredPermissionForTable(table: string, method: DataRequestMethod) {
  if (method === 'GET' && canReadWithoutAuth(table)) {
    return null;
  }
  if (table === 'admin_reports') {
    return method === 'POST' ? 'support.request' : 'support.manage';
  }
  if (ADMIN_ONLY_TABLES.has(table)) {
    return permissionPair(method, 'data.admin.read', 'data.admin.write');
  }
  if (PROVIDER_CATALOG_TABLES.has(table)) {
    return permissionPair(method, 'data.provider_catalog.read', 'data.provider_catalog.write');
  }
  if (REVIEW_TABLES.has(table)) {
    return permissionPair(method, 'data.reviews.read', 'data.reviews.write');
  }
  if (MARKETPLACE_TABLES.has(table)) {
    return permissionPair(method, 'data.marketplace.read', 'data.marketplace.write');
  }
  if (FINANCE_TABLES.has(table)) {
    return permissionPair(method, 'data.finance.read', 'data.finance.write');
  }
  if (SUBSCRIPTION_TABLES.has(table)) {
    return permissionPair(method, 'data.subscriptions.read', 'data.subscriptions.write');
  }
  if (LEARNING_TABLES.has(table)) {
    return permissionPair(method, 'data.learning.read', 'data.learning.write');
  }
  if (MESSAGING_TABLES.has(table)) {
    return permissionPair(method, 'data.messaging.read', 'data.messaging.write');
  }
  if (NOTIFICATION_TABLES.has(table)) {
    return permissionPair(method, 'data.notifications.read', 'data.notifications.write');
  }
  if (PROJECT_TABLES.has(table)) {
    return permissionPair(method, 'data.projects.read', 'data.projects.write');
  }
  return undefined;
}
