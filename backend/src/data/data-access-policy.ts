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
  'admin_feature_flags',
  'admin_integrations',
  'admin_backups',
  'admin_security_alerts',
  'admin_audit_logs',
  'auth_users',
  'auth_sessions',
]);

const SUPERADMIN_ONLY_TABLES = new Set([
  'admin_backups',
  'admin_security_alerts',
  'admin_audit_logs',
  'admin_feature_flags',
  'admin_integrations',
  'auth_users',
  'auth_sessions',
]);

export const APPEND_ONLY_TABLES = new Set([
  'payment_transactions',
  'commission_ledger',
]);

export const COMMAND_ONLY_WRITE_TABLES = new Set([
  'bookings',
  'certificates',
  'client_favorites',
  'client_orders',
  'course_enrollments',
  'course_faq_items',
  'course_lessons',
  'course_reviews',
  'course_sections',
  'courses',
  'exams',
  'funding_investors',
  'lesson_assets',
  'lesson_comments',
  'lesson_progress',
  'project_collaborations',
  'project_documents',
  'project_funding_rounds',
  'project_history',
  'project_milestones',
  'project_partnerships',
  'project_tracking',
  'projects',
  'provider_reviews',
  'provider_services',
  'provider_availability_blocks',
  'provider_verification_requests',
  'providers',
  'quiz_choices',
  'quiz_questions',
  'student_guardians',
  'submissions',
  'virtual_classes',
  'payment_transactions',
  'wallet_accounts',
  'invoices',
  'payout_accounts',
  'payout_requests',
  'commission_ledger',
  'escrow_cases',
  'provider_visibility_orders',
  'user_subscriptions',
  'provider_visibility_passes',
  'provider_visibility_products',
  'subscription_plans',
  'conversations',
  'messages',
  'notifications',
  'admin_accreditations',
  'admin_content_items',
  'admin_campaigns',
  'admin_reports',
  'admin_platform_categories',
  'admin_platform_rules',
  'admin_feature_flags',
  'admin_integrations',
  'admin_backups',
  'admin_security_alerts',
  'admin_audit_logs',
  'auth_users',
  'auth_sessions',
]);

const PROVIDER_CATALOG_TABLES = new Set([
  'providers',
  'provider_services',
  'provider_availability_blocks',
  'provider_verification_requests',
]);

const REVIEW_TABLES = new Set([
  'provider_reviews',
]);

const MARKETPLACE_TABLES = new Set([
  'bookings',
  'client_orders',
  'client_favorites',
  'provider_availability_blocks',
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

export const KNOWN_DATA_TABLES = new Set([
  ...PUBLIC_READ_TABLES,
  ...ADMIN_ONLY_TABLES,
  ...APPEND_ONLY_TABLES,
  ...PROVIDER_CATALOG_TABLES,
  ...REVIEW_TABLES,
  ...MARKETPLACE_TABLES,
  ...FINANCE_TABLES,
  ...SUBSCRIPTION_TABLES,
  ...LEARNING_TABLES,
  ...MESSAGING_TABLES,
  ...NOTIFICATION_TABLES,
  ...PROJECT_TABLES,
]);

export function isKnownDataTable(table: string) {
  return KNOWN_DATA_TABLES.has(table);
}

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
  if (SUPERADMIN_ONLY_TABLES.has(table)) {
    return permissionPair(method, 'superadmin.sensitive.read', 'superadmin.sensitive.write');
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
