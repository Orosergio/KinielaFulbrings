import {
  AuthError,
  login,
  requestPasswordRecovery,
  signup,
} from "@netlify/identity";
import { ArrowRight, KeyRound, Mail, Trophy } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Language } from "../types";

type Props = {
  language: Language;
};

export function AuthScreen({ language }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const es = language === "es";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        const user = await signup(email, password, { full_name: name.trim() });
        if (!user.confirmedAt) {
          setMessage(
            es
              ? "Revisa tu correo para confirmar la cuenta."
              : "Check your email to confirm your account.",
          );
        }
      }
    } catch (caught) {
      setError(
        caught instanceof AuthError
          ? caught.message
          : es
            ? "No se pudo completar el acceso."
            : "Authentication could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function recover() {
    if (!email) {
      setError(es ? "Escribe primero tu correo." : "Enter your email first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await requestPasswordRecovery(email);
      setMessage(
        es
          ? "Te enviamos un enlace para recuperar tu contraseña."
          : "We sent you a password recovery link.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <div className="brand-mark large">26</div>
        <p className="eyebrow">KINIELA MUNDIAL 2026</p>
        <h1>
          {es ? "Tus picks. Tu grupo. Una sola tabla." : "Your picks. Your pool. One table."}
        </h1>
        <p>
          {es
            ? "Crea grupos separados para amigos y familia. Los picks quedan sellados cuando rueda el balón."
            : "Create separate pools for friends and family. Picks are sealed at kickoff."}
        </p>
        <div className="auth-rule">
          <Trophy size={20} />
          <span>{es ? "7 puntos por marcador exacto" : "7 points for an exact score"}</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs" role="tablist">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
            type="button"
          >
            {es ? "Entrar" : "Log in"}
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
            type="button"
          >
            {es ? "Crear cuenta" : "Create account"}
          </button>
        </div>

        <div className="auth-heading">
          <h2>
            {mode === "login"
              ? es
                ? "Continúa tu quiniela"
                : "Continue your pool"
              : es
                ? "Crea tu perfil"
                : "Create your profile"}
          </h2>
          <p>
            {es
              ? "Tus resultados se guardan en la nube."
              : "Your predictions are saved securely."}
          </p>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              {es ? "Nombre" : "Name"}
              <span className="input-wrap">
                <Trophy size={17} />
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                />
              </span>
            </label>
          )}
          <label>
            {es ? "Correo" : "Email"}
            <span className="input-wrap">
              <Mail size={17} />
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </span>
          </label>
          <label>
            {es ? "Contraseña" : "Password"}
            <span className="input-wrap">
              <KeyRound size={17} />
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </span>
          </label>

          {error && <p className="form-message error">{error}</p>}
          {message && <p className="form-message success">{message}</p>}

          <button className="primary-button wide" disabled={busy} type="submit">
            {busy
              ? es
                ? "Procesando…"
                : "Working…"
              : mode === "login"
                ? es
                  ? "Entrar"
                  : "Log in"
                : es
                  ? "Crear cuenta"
                  : "Create account"}
            {!busy && <ArrowRight size={18} />}
          </button>

          {mode === "login" && (
            <button className="text-button" onClick={recover} type="button">
              {es ? "Olvidé mi contraseña" : "Forgot password"}
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
