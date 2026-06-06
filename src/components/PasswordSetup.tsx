import { acceptInvite, AuthError, updateUser } from "@netlify/identity";
import { KeyRound } from "lucide-react";
import { FormEvent, useState } from "react";
import type { Language } from "../types";

type Props = {
  language: Language;
  inviteToken?: string;
  onComplete: () => void;
};

export function PasswordSetup({ language, inviteToken, onComplete }: Props) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const es = language === "es";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (inviteToken) await acceptInvite(inviteToken, password);
      else await updateUser({ password });
      onComplete();
    } catch (caught) {
      setError(caught instanceof AuthError ? caught.message : "Request failed");
      setBusy(false);
    }
  }

  return (
    <main className="password-layout">
      <section className="password-panel">
        <div className="brand-mark large">26</div>
        <h1>
          {inviteToken
            ? es
              ? "Acepta tu invitación"
              : "Accept your invitation"
            : es
              ? "Crea una nueva contraseña"
              : "Create a new password"}
        </h1>
        <p>
          {es
            ? "Usa al menos 8 caracteres."
            : "Use at least 8 characters."}
        </p>
        <form onSubmit={submit}>
          <label>
            {es ? "Nueva contraseña" : "New password"}
            <span className="input-wrap">
              <KeyRound size={17} />
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </span>
          </label>
          {error && <p className="form-message error">{error}</p>}
          <button className="primary-button wide" disabled={busy} type="submit">
            {busy
              ? "…"
              : es
                ? "Guardar contraseña"
                : "Save password"}
          </button>
        </form>
      </section>
    </main>
  );
}
