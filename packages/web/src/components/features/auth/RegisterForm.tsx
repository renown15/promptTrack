import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema } from "@prompttrack/shared";
import type { RegisterInput } from "@prompttrack/shared";
import { authApi } from "@/api/endpoints/auth";
import { useAuthStore } from "@/stores/authStore";
import "@/components/features/auth/RegisterForm.css";

type Props = {
  onSuccess: () => void;
};

export function RegisterForm({ onSuccess }: Props) {
  const { setTokens } = useAuthStore();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema) as unknown as Resolver<RegisterInput>,
  });

  const onSubmit = async (data: RegisterInput) => {
    try {
      const tokens = await authApi.register(data);
      setTokens(tokens.accessToken, tokens.refreshToken);
      onSuccess();
    } catch {
      setError("root", {
        message: "Registration failed. Email may already be in use.",
      });
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit(onSubmit)}>
      {errors.root && (
        <p className="register-form__global-error">{errors.root.message}</p>
      )}
      <div className="register-form__field">
        <label className="register-form__label" htmlFor="name">
          Name
        </label>
        <input
          {...register("name")}
          id="name"
          type="text"
          autoComplete="name"
          className={`register-form__input${errors.name ? " register-form__input--error" : ""}`}
          placeholder="Your name"
        />
        {errors.name && (
          <span className="register-form__error">{errors.name.message}</span>
        )}
      </div>
      <div className="register-form__field">
        <label className="register-form__label" htmlFor="email">
          Email
        </label>
        <input
          {...register("email")}
          id="email"
          type="email"
          autoComplete="email"
          className={`register-form__input${errors.email ? " register-form__input--error" : ""}`}
          placeholder="you@example.com"
        />
        {errors.email && (
          <span className="register-form__error">{errors.email.message}</span>
        )}
      </div>
      <div className="register-form__field">
        <label className="register-form__label" htmlFor="password">
          Password
        </label>
        <input
          {...register("password")}
          id="password"
          type="password"
          autoComplete="new-password"
          className={`register-form__input${errors.password ? " register-form__input--error" : ""}`}
          placeholder="Min. 8 characters"
        />
        {errors.password && (
          <span className="register-form__error">
            {errors.password.message}
          </span>
        )}
      </div>
      <button
        className="register-form__submit"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
