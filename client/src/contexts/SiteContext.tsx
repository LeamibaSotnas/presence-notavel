import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  siteConfig as defaultConfig,
  type SiteConfig,
} from "@/config/site.config";
import { applyPreset } from "@/config/themes";
import { content as contentApi, type StoredContent } from "@/lib/api";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Faz o merge do conteúdo salvo sobre o config embutido.
 *
 * Duas regras, e a distinção entre elas importa:
 *
 *  • Objetos são mesclados campo a campo. Assim, um documento salvo que traga
 *    apenas `identity.name` não apaga o resto da identidade — o que aconteceria
 *    com substituição de seção inteira. Protege contra documento parcial vindo
 *    de uma versão antiga do painel ou de um ajuste manual no banco.
 *
 *  • Arrays são substituídos por inteiro, nunca mesclados item a item. Precisa
 *    ser assim: se o cliente remove um trabalho do portfólio, mesclar por
 *    índice o traria de volta.
 */
function mergeContent(base: unknown, stored: unknown): unknown {
  if (stored === undefined || stored === null) return base;
  if (!isPlainObject(base) || !isPlainObject(stored)) return stored;

  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined || value === null) continue;
    result[key] = mergeContent(base[key], value);
  }
  return result;
}

function mergeConfig(
  base: SiteConfig,
  stored: StoredContent | null
): SiteConfig {
  if (!stored) return base;
  return mergeContent(base, stored) as SiteConfig;
}

type SiteContextValue = {
  config: SiteConfig;
  /** false enquanto a primeira carga da API não terminou. */
  ready: boolean;
  /** true quando o conteúdo vem do banco; false quando é o config embutido. */
  fromApi: boolean;
  updatedAt: number | null;
  refresh: () => Promise<void>;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredContent | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [fromApi, setFromApi] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await contentApi.get();
      setStored(data.content);
      setUpdatedAt(data.updatedAt);
      setFromApi(data.content !== null);
    } catch {
      // API indisponível (rodando só o Vite, ou Worker fora do ar): o site
      // segue funcionando com o config embutido. Falha silenciosa é correta
      // aqui — o visitante não deve ver erro por causa disso.
      setFromApi(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const config = useMemo(() => mergeConfig(defaultConfig, stored), [stored]);

  useEffect(() => {
    applyPreset(config.theme?.typography);
  }, [config.theme?.typography]);

  const value = useMemo(
    () => ({ config, ready, fromApi, updatedAt, refresh: load }),
    [config, ready, fromApi, updatedAt, load]
  );

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

/** Configuração efetiva do site (banco quando existe, config embutido quando não). */
export function useSite() {
  const context = useContext(SiteContext);
  if (!context)
    throw new Error("useSite precisa estar dentro de <SiteProvider>");
  return context.config;
}

/** Metadados da carga — usado pelo painel, não pelas seções públicas. */
export function useSiteMeta() {
  const context = useContext(SiteContext);
  if (!context)
    throw new Error("useSiteMeta precisa estar dentro de <SiteProvider>");
  return context;
}
