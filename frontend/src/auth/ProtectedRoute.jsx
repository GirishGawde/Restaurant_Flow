
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getHomeRouteForRole } from "./roles";

export function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, role } = useAuth();

  // If not logged in, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If role is not authorized for this route, redirect to user's home route
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to={getHomeRouteForRole(role)} replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
