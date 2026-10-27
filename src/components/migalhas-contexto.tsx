"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = {
  rotulos: Record<string, string>;
  definir: (href: string, rotulo: string) => void;
  limpar: (href: string) => void;
};

const MigalhasCtx = createContext<Ctx | null>(null);

export function ProvedorMigalhas({ children }: { children: React.ReactNode }) {
  const [rotulos, setRotulos] = useState<Record<string, string>>({});
  const definir = useCallback((href: string, rotulo: string) => {
    setRotulos((antes) => (antes[href] === rotulo ? antes : { ...antes, [href]: rotulo }));
  }, []);
  const limpar = useCallback((href: string) => {
    setRotulos((antes) => {
      if (!(href in antes)) return antes;
      const seguinte = { ...antes };
      delete seguinte[href];
      return seguinte;
    });
  }, []);
  const valor = useMemo(() => ({ rotulos, definir, limpar }), [rotulos, definir, limpar]);
  return <MigalhasCtx.Provider value={valor}>{children}</MigalhasCtx.Provider>;
}

export function useRotulosMigalha() {
  const ctx = useContext(MigalhasCtx);
  if (!ctx) throw new Error("ProvedorMigalhas em falta");
  return ctx;
}

/** A página define o rótulo da migalha de entidade (referência da ordem, nome da equipa). */
export function DefinirMigalha({ href, rotulo }: { href: string; rotulo: string }) {
  const { definir, limpar } = useRotulosMigalha();
  useEffect(() => {
    definir(href, rotulo);
    return () => limpar(href);
  }, [href, rotulo, definir, limpar]);
  return null;
}
