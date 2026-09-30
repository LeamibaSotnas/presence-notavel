import { useCallback, useRef } from "react";

/**
 * Devolve uma função com identidade estável entre renders que sempre executa
 * a versão mais recente do callback recebido. Usado por useComposition
 * (input/textarea) para não recriar handlers a cada render.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePersistFn<T extends (...args: any[]) => any>(fn: T): T {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persisted = useRef<T | null>(null);
  if (!persisted.current) {
    persisted.current = function (this: unknown, ...args) {
      return fnRef.current.apply(this, args);
    } as T;
  }

  return useCallback(persisted.current, []) as T;
}
