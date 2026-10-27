import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eCentral, type Ator } from "@/lib/rules";
import { baseDados } from "./db";
import { ErroHttp } from "./erros";
import { obterAtor } from "./sessao";

/**
 * Autenticação do webhook OFSC (`POST /api/integracao/ofsc/eventos`) e dos endpoints OFSC simulados
 * (`/api/ofsc/{operador}/…`). Quem chama prova quem é de uma de duas maneiras:
 *
 *  - segredo partilhado, no cabeçalho `x-vagacerta-segredo` ou em `Authorization: Bearer …`
 *    (é o que um OFSC real, ou um script, usa); ou
 *  - sessão da central (administrador ou supervisor), por exemplo a consola no browser.
 *
 * O segredo vem de `VC_OFSC_SEGREDO`. Sem essa variável há um segredo de desenvolvimento, gerado à
 * primeira utilização e guardado só na base local (`definicoes.segredo_integracao`). Nunca é impresso.
 */
const CHAVE_SEGREDO = "segredo_integracao";

export function segredoIntegracao(): string {
  const doAmbiente = process.env.VC_OFSC_SEGREDO?.trim();
  if (doAmbiente) return doAmbiente;
  const db = baseDados();
  const ler = () => db.prepare("SELECT valor FROM definicoes WHERE chave = ?").get(CHAVE_SEGREDO) as { valor: string } | undefined;
  const existente = ler();
  if (existente?.valor) return existente.valor;
  db.prepare("INSERT OR IGNORE INTO definicoes (chave, valor) VALUES (?, ?)").run(CHAVE_SEGREDO, randomBytes(32).toString("hex"));
  return ler()!.valor;
}

function impressao(valor: string): Buffer {
  return createHash("sha256").update(valor).digest();
}

/** Comparação em tempo constante (compara as impressões SHA-256, que têm sempre o mesmo tamanho). */
export function segredoConfere(recebido: string): boolean {
  if (!recebido) return false;
  return timingSafeEqual(impressao(recebido), impressao(segredoIntegracao()));
}

export function segredoDoPedido(pedido: Request): string | null {
  const direto = pedido.headers.get("x-vagacerta-segredo")?.trim();
  if (direto) return direto;
  const autorizacao = pedido.headers.get("authorization")?.trim() ?? "";
  const bearer = /^Bearer\s+(.+)$/i.exec(autorizacao);
  return bearer?.[1]?.trim() || null;
}

const MENSAGEM_EM_FALTA = "Autenticação em falta: envie o segredo da integração ou use uma sessão da central.";
export const MENSAGEM_SO_CENTRAL_INTEGRACAO = "Só a central usa a integração OFSC.";

/** Lança 401 (sem credenciais, ou segredo errado) ou 403 (sessão que não é da central). */
export async function autenticarIntegracao(pedido: Request): Promise<{ via: "segredo" } | { via: "sessao"; ator: Ator }> {
  const segredo = segredoDoPedido(pedido);
  if (segredo !== null) {
    if (segredoConfere(segredo)) return { via: "segredo" };
    throw new ErroHttp(401, "NAO_AUTENTICADO", MENSAGEM_EM_FALTA);
  }
  const ator = await obterAtor();
  if (!ator) throw new ErroHttp(401, "NAO_AUTENTICADO", MENSAGEM_EM_FALTA);
  if (!eCentral(ator)) {
    throw new ErroHttp(403, "SEM_PERMISSAO", MENSAGEM_SO_CENTRAL_INTEGRACAO);
  }
  return { via: "sessao", ator };
}
