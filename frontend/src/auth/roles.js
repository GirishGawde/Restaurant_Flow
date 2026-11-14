/**
 * src/auth/roles.js
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Defines the staff roles in the restaurant system and their home landing routes:
 * - admin:   Manager dashboard (/admin/dashboard)
 * - waiter:  Table map (/waiter/tables)
 * - chef:    Kitchen display board (/kitchen/board)
 * - cashier: Open bills list (/cashier/bills)
 */

export const ROLES = {
  ADMIN: "admin",
  WAITER: "waiter",
  CHEF: "chef",
  CASHIER: "cashier",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Admin",
  [ROLES.CASHIER]: "Cashier",
  [ROLES.WAITER]: "Waiter",
  [ROLES.CHEF]: "Kitchen Staff",
};

export const HOME_ROUTES = {
  [ROLES.ADMIN]: "/admin/dashboard",
  [ROLES.WAITER]: "/waiter/tables",
  [ROLES.CHEF]: "/kitchen/board",
  [ROLES.CASHIER]: "/cashier/bills",
};

/**
 * Returns the default home screen path for a given role.
 * If role is unrecognized, falls back to /login.
 */
export function getHomeRouteForRole(role) {
  return HOME_ROUTES[role] || "/login";
}
