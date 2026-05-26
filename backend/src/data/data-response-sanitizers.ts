import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';

function pick(row: Row, keys: string[]) {
  return keys.reduce<Row>((next, key) => {
    if (row[key] !== undefined) {
      next[key] = row[key];
    }
    return next;
  }, {});
}

const PUBLIC_PROJECT_FIELDS = [
  'id',
  'title',
  'description',
  'category',
  'sector',
  'status',
  'phase',
  'porteur_name',
  'funding',
  'funding_goal',
  'team_size',
  'mentors',
  'progress',
  'last_update',
  'next_milestone',
  'location',
  'impact',
  'image',
  'looking_for',
  'created_at',
];

const PUBLIC_PROJECT_MILESTONE_FIELDS = [
  'id',
  'project_id',
  'project_title',
  'title',
  'description',
  'due_date',
  'status',
  'progress',
];

const PUBLIC_PROJECT_HISTORY_FIELDS = [
  'id',
  'project_id',
  'project_title',
  'date',
  'user',
  'action',
  'type',
];

const PUBLIC_PROJECT_PARTNERSHIP_FIELDS = [
  'id',
  'project_id',
  'project_title',
  'name',
  'role',
  'type',
  'avatar',
  'expertise',
  'status',
  'last_activity',
];

const PUBLIC_FUNDING_ROUND_FIELDS = [
  'id',
  'project_id',
  'project_title',
  'project_name',
  'type',
  'target_amount',
  'raised_amount',
  'deadline',
  'start_date',
  'status',
  'description',
  'progress_percent',
];

export function sanitizeRowsForActor(table: string, rows: Row[], user: AuthUser | null) {
  if (user) {
    if (table === 'projects' && !isAdminRole(user)) {
      return rows.map((row) => {
        if (user.role === 'porteur' && String(row.owner_id) === String(user.id)) {
          return row;
        }
        return pick(row, PUBLIC_PROJECT_FIELDS);
      });
    }

    return rows;
  }

  switch (table) {
    case 'projects':
      return rows.map((row) => pick(row, PUBLIC_PROJECT_FIELDS));
    case 'project_milestones':
      return rows.map((row) => pick(row, PUBLIC_PROJECT_MILESTONE_FIELDS));
    case 'project_history':
      return rows.map((row) => pick(row, PUBLIC_PROJECT_HISTORY_FIELDS));
    case 'project_partnerships':
      return rows.map((row) => pick(row, PUBLIC_PROJECT_PARTNERSHIP_FIELDS));
    case 'project_funding_rounds':
      return rows.map((row) => pick(row, PUBLIC_FUNDING_ROUND_FIELDS));
    case 'project_documents':
    case 'funding_investors':
      return [];
    default:
      return rows;
  }
}
