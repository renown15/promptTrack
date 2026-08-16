import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@prompttrack/shared";
import { authApi } from "@/api/endpoints/auth";
import { useAuthStore } from "@/stores/authStore";
import type { LoginInput } from "@prompttrack/shared";
import "@/components/features/auth/LoginForm.css";

type Props = {
  onSuccess: () => void;
};

export function LoginForm({ onSuccess }: Props) {
  const { setTokens } = useAuthStore();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = async (data: LoginInput) => {
    try {
      const tokens = await authApi.login(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      onSuccess();
    } catch {
      setError("root", { message: "Invalid email or password" });
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
      {errors.root && (
        <p className="login-form__global-error">{errors.root.message}</p>
      )}
      <div className="login-form__field">
        <label className="login-form__label" htmlFor="email">
          Email
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          className={`login-form__input${errors.email ? " login-form__input--error" : ""}`}
          placeholder="you@example.com"
        />
        {errors.email && (
          <span className="login-form__error">{errors.email.message}</span>
        )}
      </div>
      <div className="login-form__field">
        <label className="login-form__label" htmlFor="password">
          Password
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="current-password"
          className={`login-form__input${errors.password ? " login-form__input--error" : ""}`}
          placeholder="••••••••"
        />
        {errors.password && (
          <span className="login-form__error">{errors.password.message}</span>
        )}
      </div>
      <button
        className="login-form__submit"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
