/**
 * src/App.jsx
 * Owner: Girish (Module 1 - Admin & Auth)
 *
 * Application routing configuration implementing all 20 screens from docs/screens.md:
 * - Module 1 (Girish): Login, ForgotPassword, ResetPassword, Profile, Dashboard, MenuManagement, StaffManagement, Reports, AuditLog
 * - Modules 2, 3, 4 (Ayush, Diya, Sakshi): Waiter, Kitchen, Cashier placeholder pages
 * - Root redirector to active role home screen or /login
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./auth/ProtectedRoute";
import RoleLayout from "./layouts/RoleLayout";
import { ROLES, getHomeRouteForRole } from "./auth/roles";
import PlaceholderPage from "./components/PlaceholderPage";

// Authentication pages (Module 1 - Girish)
import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import Profile from "./pages/auth/Profile";

// Admin pages (Module 1 - Girish)
import Dashboard from "./pages/admin/Dashboard";
import MenuManagement from "./pages/admin/MenuManagement";
import StaffManagement from "./pages/admin/StaffManagement";
import Reports from "./pages/admin/Reports";
import AuditLog from "./pages/admin/AuditLog";

// Kitchen & Stations pages (Module 3 - Diya)
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";
import TicketDetail from "./pages/kitchen/TicketDetail";
import StationsManagement from "./pages/kitchen/StationsManagement";
import KitchenConcurrencyDemo from "./pages/kitchen/KitchenConcurrencyDemo";

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
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/menu"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <MenuManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/staff"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <StaffManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <AuditLog />
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

              {/* Module 3: Kitchen & Stations Routes (Diya) */}
              <Route
                path="/kitchen/board"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CHEF, ROLES.ADMIN]}>
                    <KitchenDisplay />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kitchen/tickets/:orderId"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CHEF, ROLES.ADMIN]}>
                    <TicketDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kitchen/stations"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CHEF, ROLES.ADMIN]}>
                    <StationsManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kitchen/demo"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.CHEF, ROLES.ADMIN]}>
                    <KitchenConcurrencyDemo />
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
