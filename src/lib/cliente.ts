"use client";

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
        : "Não foi possível concluir o pedido.";
    throw new Error(mensagem);
  }
  return dados as T;
}
