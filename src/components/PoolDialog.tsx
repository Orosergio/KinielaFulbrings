import { FormEvent, useState } from "react";
import { Users, X } from "lucide-react";
import type { Language } from "../types";
import { translate } from "../lib/i18n";

type Props = {
  language: Language;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
};

export function PoolDialog({ language, onClose, onCreate, onJoin }: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (tab === "create") await onCreate(value);
      else await onJoin(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Request failed");
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pool-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title">
            <Users size={21} />
            <h2 id="pool-dialog-title">{t("manageGroups")}</h2>
          </div>
          <button className="icon-button" onClick={onClose} title={t("cancel")}>
            <X size={19} />
          </button>
        </div>
        <div className="segmented">
          <button
            className={tab === "create" ? "active" : ""}
            onClick={() => {
              setTab("create");
              setValue("");
              setError("");
            }}
          >
            {t("createGroup")}
          </button>
          <button
            className={tab === "join" ? "active" : ""}
            onClick={() => {
              setTab("join");
              setValue("");
              setError("");
            }}
          >
            {t("joinGroup")}
          </button>
        </div>
        <form onSubmit={submit}>
          <label>
            {tab === "create" ? t("groupName") : t("inviteCode")}
            <input
              autoFocus
              required
              minLength={tab === "create" ? 2 : 5}
              maxLength={tab === "create" ? 80 : 10}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={tab === "create" ? "Familia 2026" : "MUNDIAL26"}
            />
          </label>
          {error && <p className="form-message error">{error}</p>}
          <div className="modal-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              {t("cancel")}
            </button>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "…" : tab === "create" ? t("create") : t("join")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
