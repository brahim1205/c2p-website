import type { Request, Response } from 'express';
import type { AuthUser, Role } from '../../auth/auth.store.js';

export interface RequestMeta {
  ip: string;
  userAgent: string;
  requestId: string;
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  csrfToken: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
  requestId?: string;
  rawBody?: Buffer;
}

export interface ResponseWithLocals extends Response {
  locals: Response['locals'] & {
    requestId?: string;
  };
}

export function hasRole(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}
