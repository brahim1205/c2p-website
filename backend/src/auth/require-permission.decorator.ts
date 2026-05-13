import { SetMetadata } from '@nestjs/common';

export const RBAC_PERMISSION_METADATA_KEY = 'rbac:permissions';

export function RequirePermission(...permissions: string[]) {
  return SetMetadata(RBAC_PERMISSION_METADATA_KEY, permissions);
}
