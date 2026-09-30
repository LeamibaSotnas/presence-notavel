import { useState } from "react";
import { ArrowUpRight, Loader2, Lock } from "lucide-react";
import { useSite } from "@/contexts/SiteContext";
import { ApiError } from "@/lib/api";
import { useAdminAuth } from "./AdminAuthContext";

export default function AdminLogin() {
  const site = useSite();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível entrar. Verifique sua conexão."
      );
      setBusy(false);
    }
  }

  return (
    <div className="admin-auth">
      <form className="admin-auth-card" onSubmit={handleSubmit}>
        <span className="admin-auth-mark">{site.identity.initials}</span>
        <h1>Painel</h1>
        <p>{site.identity.name}</p>

        <div className="field">
          <label htmlFor="admin-email">E-mail</label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="admin-password">Senha</label>
          <input
            id="admin-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="peach-button wide" disabled={busy}>
          {busy ? (
            <>
              <Loader2 size={15} className="spin" /> Entrando
            </>
          ) : (
            <>
              Entrar <ArrowUpRight size={15} />
            </>
          )}
        </button>

        <span className="admin-auth-note">
          <Lock size={11} /> Acesso restrito ao administrador do site
        </span>
      </form>
    </div>
  );
}
