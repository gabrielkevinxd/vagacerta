"use client";

import { createContext, useContext, useEffect } from "react";
import { IDIOMA_OMISSAO, mensagensDe, t, type Chave, type Idioma, type Mensagens } from "@/lib/i18n";

const Contexto = createContext<{ idioma: Idioma; mensagens: Mensagens }>({
  idioma: IDIOMA_OMISSAO,
  mensagens: mensagensDe(IDIOMA_OMISSAO),
});

export function ProvedorIdioma({
  idioma,
  mensagens,
  children,
}: {
  idioma: Idioma;
  mensagens: Mensagens;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = idioma;
  }, [idioma]);
  return <Contexto.Provider value={{ idioma, mensagens }}>{children}</Contexto.Provider>;
}

export function useIdioma() {
  return useContext(Contexto);
}

export function useT() {
  const { idioma, mensagens } = useContext(Contexto);
  return {
    idioma,
    m: mensagens,
    t: (chave: Chave, vars?: Record<string, string | number>) => t(mensagens, chave, vars),
  };
}
