/**
 * src/App.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Application routing configuration implementing all 20 screens from docs/screens.md.
 * - Wraps authenticated routes in ProtectedRoute with role authorization.
 * - Displays PlaceholderPage for screens pending teammate implementation.
 * - Redirects "/" to the logged-in staff member's home screen or /login.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleLayout from "./layouts/RoleLayout";
import { ROLES, getHomeRouteForRole } from "./auth/roles";
import PlaceholderPage from "./components/PlaceholderPage";

// Authentication pages
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Profile from "./pages/auth/Profile";

/**
 * Root index component that redirects to role home route if logged in,
 * or /login if unauthenticated.
 */
function RootRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={getHomeRouteForRole(role)} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public authentication routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Root route redirector */}
            <Route path="/" element={<RootRedirect />} />

            {/* Authenticated routes wrapped with RoleLayout (TopBar + Content) */}
            <Route element={<RoleLayout />}>
              {/* Profile & Settings (Screen 3: Girish) - accessible to all logged-in roles */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WAITER, ROLES.CHEF, ROLES.CASHIER]}>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Module 1: Admin Routes (Girish) */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="16"
                      title="Manager Dashboard"
                      owner="Girish"
                      description="Dashboard showing live table statuses, active orders, and kitchen load statistics."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/menu"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="17"
                      title="Menu Management"
                      owner="Girish"
                      description="Create, update, toggle active status, and assign stations for menu items."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/staff"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="18"
                      title="Staff Management"
                      owner="Girish"
                      description="List staff accounts, assign roles, and activate or deactivate user logins."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="19"
                      title="Sales & Operations Reports"
                      owner="Girish"
                      description="Business reports: sales by day, best-sellers, table turnover, and waiter performance."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="20"
                      title="Audit Log & Chain Verification"
                      owner="Girish"
                      description="Tamper-evident audit log of all database mutations with cryptographic hash chain verification."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Module 2: Waiter Routes (Ayush) */}
              <Route
                path="/waiter/tables"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.WAITER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="4"
                      title="Waiter: Table Map"
                      owner="Ayush"
                      description="Table status grid (free, occupied, reserved, needs_cleaning) with section filters."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waiter/orders/new"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.WAITER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="5"
                      title="Waiter: Open New Order"
                      owner="Ayush"
                      description="Select table, specify guest count, add notes, and initialize order."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waiter/menu"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.WAITER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="6"
                      title="Waiter: Menu Browser"
                      owner="Ayush"
                      description="Browse menu items with live search, ingredients search, and add draft items."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waiter/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.WAITER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="7"
                      title="Waiter: Order Panel"
                      owner="Ayush"
                      description="Order review, item quantity modifications, Send to Kitchen, conflict detection, and Request Bill."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waiter/orders"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.WAITER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="10"
                      title="Waiter: My Orders"
                      owner="Ayush"
                      description="Filter and search orders by status, table, and date."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Module 3: Kitchen Routes (Diya) */}
              <Route
                path="/kitchen/board"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CHEF, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="11"
                      title="Kitchen Display Board"
                      owner="Diya"
                      description="Live kitchen display grouped by order, auto-refreshing via polling, with station filters and elapsed prep timers."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kitchen/tickets/:orderId"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CHEF, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="12"
                      title="Kitchen Ticket Detail"
                      owner="Diya"
                      description="Ticket breakdown with station items, prep state progression, and issue reporting."
                    />
                  </ProtectedRoute>
                }
              />

              {/* Module 4: Cashier Routes (Sakshi) */}
              <Route
                path="/cashier/bills"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="13"
                      title="Cashier: Open Bills List"
                      owner="Sakshi"
                      description="List of unpaid bills waiting for settlement."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashier/bills/:orderId"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="13"
                      title="Cashier: Bill and Payment"
                      owner="Sakshi"
                      description="Detailed bill review, promotion code application, and single-payer checkout."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashier/bills/:id/split"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="14"
                      title="Cashier: Split Bill"
                      owner="Sakshi"
                      description="Split bill between multiple guests with transaction consistency validation."
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cashier/receipt/:billId"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CASHIER, ROLES.ADMIN]}>
                    <PlaceholderPage
                      screenNumber="15"
                      title="Cashier: Payment Confirmation & Receipt"
                      owner="Sakshi"
                      description="Printable receipt and payment settlement verification."
                    />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
