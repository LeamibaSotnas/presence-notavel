import { useCallback, useEffect, useMemo, useState } from "react";
import type { SiteConfig } from "@/config/site.config";
import { useSiteMeta } from "@/contexts/SiteContext";
import { ApiError, content as contentApi } from "@/lib/api";

/**
 * Rascunho editável do conteúdo do site.
 *
 * Parte da configuração efetiva (banco quando existe, config embutido quando
 * não) e mantém as alterações locais até o cliente salvar. `dirty` é comparação
 * de JSON — barato para um documento deste tamanho e imune a falso positivo por
 * identidade de objeto.
 */
export function useContentDraft() {
  const { config, ready, fromApi, updatedAt, refresh } = useSiteMeta();
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Inicializa quando a primeira carga termina, e não sobrescreve edição
  // em andamento se o contexto atualizar depois.
  useEffect(() => {
    if (ready && draft === null) {
      setDraft(structuredClone(config));
    }
  }, [ready, config, draft]);

  const baseline = useMemo(() => JSON.stringify(config), [config]);
  const dirty = draft !== null && JSON.stringify(draft) !== baseline;

  /** Atualiza uma seção inteira do rascunho. */
  const patch = useCallback(
    <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => {
      setDraft(current => (current ? { ...current, [key]: value } : current));
      setSavedAt(null);
    },
    []
  );

  /** Atualiza um campo dentro de uma seção que é objeto. */
  const patchField = useCallback(
    <K extends keyof SiteConfig, F extends keyof SiteConfig[K]>(
      section: K,
      field: F,
      value: SiteConfig[K][F]
    ) => {
      setDraft(current => {
        if (!current) return current;
        const previous = current[section] as Record<string, unknown>;
        return { ...current, [section]: { ...previous, [field]: value } };
      });
      setSavedAt(null);
    },
    []
  );

  const save = useCallback(async () => {
    if (!draft) return false;
    setSaving(true);
    setError(null);
    try {
      const result = await contentApi.save(draft);
      setSavedAt(result.updatedAt);
      await refresh();
      return true;
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Não foi possível salvar. Verifique sua conexão."
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, refresh]);

  const discard = useCallback(() => {
    setDraft(structuredClone(config));
    setError(null);
    setSavedAt(null);
  }, [config]);

  return {
    draft,
    patch,
    patchField,
    save,
    discard,
    dirty,
    saving,
    error,
    /** Momento do salvamento feito nesta sessão, se houve. */
    savedAt,
    /**
     * Momento da última publicação segundo o servidor — inclusive de sessões
     * anteriores. É o que responde "o que está no ar agora é o meu último
     * trabalho?", pergunta que o estado do botão não responde: ele só sabe o
     * que aconteceu nesta aba, desde que ela abriu.
     */
    publishedAt: savedAt ?? updatedAt,
    /** false = o site está servindo o conteúdo de fábrica, não o do banco. */
    fromApi,
  };
}

/** Avisa antes de fechar a aba com alterações não salvas. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      return "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
