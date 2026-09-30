import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import { typographyPresets } from "@/config/themes";
import { AdminLayout, AdminPageHeader } from "./AdminLayout";
import { useContentDraft, useUnsavedGuard } from "./useContentDraft";

export default function AdminTheme() {
  const { draft, patch, save, discard, dirty, saving, error } =
    useContentDraft();
  useUnsavedGuard(dirty);

  if (!draft) {
    return (
      <AdminLayout>
        <p className="admin-hint">Carregando…</p>
      </AdminLayout>
    );
  }

  const current = draft.theme?.typography ?? "editorial";

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Tipografia"
        description="Combinações testadas de fontes. A escolha vale para todo o site."
        actions={
          <>
            {dirty && (
              <button
                type="button"
                className="admin-btn ghost"
                onClick={discard}
              >
                <RotateCcw size={14} /> Descartar
              </button>
            )}
            <button
              type="button"
              className="admin-btn primary"
              onClick={() => void save()}
              disabled={!dirty || saving}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="spin" /> Salvando
                </>
              ) : (
                <>
                  <Save size={14} /> Publicar
                </>
              )}
            </button>
          </>
        }
      />

      {error && <p className="admin-error">{error}</p>}
      <p className="admin-note">
        Cada par vem com entrelinha, peso e espaçamento já ajustados para o
        layout. Por isso não há campo de fonte livre: a combinação errada
        desmonta a hierarquia visual da página.
      </p>

      <div className="theme-grid">
        {typographyPresets.map(preset => {
          const active = preset.id === current;
          return (
            <button
              type="button"
              key={preset.id}
              className={`theme-card ${active ? "active" : ""}`}
              onClick={() => patch("theme", { typography: preset.id })}
              aria-pressed={active}
            >
              {/* Preview escrito na própria fonte do preset. A fonte pode ainda
                  não ter carregado; o fallback serifado/sans mantém a leitura. */}
              <link rel="stylesheet" href={preset.fontsUrl} />

              <span className="theme-card-top">
                <strong>{preset.name}</strong>
                {active && (
                  <span className="theme-check">
                    <Check size={13} /> em uso
                  </span>
                )}
              </span>

              <span
                className="theme-sample-display"
                style={{
                  fontFamily: preset.display,
                  fontWeight: Number(preset.tuning.displayWeight),
                  letterSpacing: preset.tuning.displayTracking,
                  lineHeight: preset.tuning.displayLineHeight,
                }}
              >
                Imagem que <i>fica.</i>
              </span>

              <span
                className="theme-sample-body"
                style={{ fontFamily: preset.body }}
              >
                Presença é a soma entre o que se comunica e o que se faz sentir.
                ABCDEFG · 0123456789
              </span>

              <small>{preset.description}</small>
            </button>
          );
        })}
      </div>
    </AdminLayout>
  );
}
