export type UserRole = 'manager' | 'consultant' | 'analyst';

export const ROLES: Record<string, UserRole> = {
    MANAGER: 'manager',
    CONSULTANT: 'consultant',
    ANALYST: 'analyst',
};

export const ROLE_LABELS: Record<UserRole, string> = {
    manager: 'Gestor',
    consultant: 'Consultor',
    analyst: 'Analista',
};

export const PERMISSIONS = {
    VIEW_FINANCIAL: ['manager'],
    EDIT_GOALS: ['manager'],
    MANAGE_CRM_COLUMNS: ['manager'],
    MANAGE_SETTINGS: ['manager'],
};

export const hasPermission = (userRole: string | null | undefined, permission: string[]): boolean => {
    if (!userRole) return false;
    // Normalize role string just in case
    const role = userRole.toLowerCase() as UserRole;
    return permission.includes(role);
};
