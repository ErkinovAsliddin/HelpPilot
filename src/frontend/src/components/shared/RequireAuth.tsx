import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
export default function RequireAuth({ children }: { children: ReactNode }) {
  const key = sessionStorage.getItem('apiKey');
  if (!key) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
