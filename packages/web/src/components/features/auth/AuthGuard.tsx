import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function AuthGuard({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
