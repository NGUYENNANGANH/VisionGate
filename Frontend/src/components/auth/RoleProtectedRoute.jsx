import { Navigate } from "react-router-dom";
import { authService } from "../../services/authService";

export function RoleProtectedRoute({ children, allowedRoles }) {
  const user = authService.getUser();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" />;
  }

  // Check role (hỗ trợ cả số và chuỗi)
  const userRole = user?.role;
  const hasPermission = allowedRoles.some(
    (role) =>
      role === userRole ||
      (role === 0 && userRole === "SuperAdmin") ||
      (role === 1 && userRole === "Admin") ||
      (role === 2 && userRole === "Viewer"),
  );

  if (!hasPermission) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}
