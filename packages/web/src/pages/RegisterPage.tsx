import { Link, useNavigate } from "react-router-dom";
import { RegisterForm } from "@/components/features/auth/RegisterForm";
import "@/pages/RegisterPage.css";

export function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="register-page">
      <div className="register-page__card">
        <h1 className="register-page__title">PromptTrack</h1>
        <p className="register-page__subtitle">Create your account</p>
        <RegisterForm onSuccess={() => navigate("/dashboard")} />
        <p className="register-page__footer">
          Already have an account?{" "}
          <Link className="register-page__link" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
