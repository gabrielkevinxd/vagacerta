"use client";

// Só quando a resposta não traz uma mensagem do servidor (por exemplo uma página de erro em vez de JSON).
// O servidor traduz todas as suas mensagens; este texto é o único que nasce no browser, por isso segue o cookie de idioma.
const SEM_RESPOSTA = {
  "pt-PT": "Não foi possível concluir o pedido.",
  en: "The request could not be completed.",
} as const;

function idiomaDoBrowser(): keyof typeof SEM_RESPOSTA {
  return /(?:^|;\s*)vc_idioma=en(?:;|$)/.test(typeof document === "undefined" ? "" : document.cookie) ? "en" : "pt-PT";
}

export async function enviar<T = unknown>(url: string, corpo?: unknown, metodo = "POST"): Promise<T> {
  const resposta = await fetch(url, {
    method: metodo,
    credentials: "include",
    headers: corpo === undefined ? undefined : { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const dados = (await resposta.json().catch(() => null)) as { mensagem?: string } | T | null;
  if (!resposta.ok) {
    const mensagem =
      dados && typeof dados === "object" && "mensagem" in dados && typeof dados.mensagem === "string"
        ? dados.mensagem
        : SEM_RESPOSTA[idiomaDoBrowser()];
    throw new Error(mensagem);
  }
  return dados as T;
}
