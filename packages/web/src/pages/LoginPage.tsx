import { Link, useNavigate } from "react-router-dom";
import { LoginForm } from "@/components/features/auth/LoginForm";
import "@/pages/LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">PromptTrack</h1>
        <p className="login-page__subtitle">Sign in to your account</p>
        <LoginForm onSuccess={() => navigate("/dashboard")} />
        <p className="login-page__footer">
          No account?{" "}
          <Link className="login-page__link" to="/register">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
