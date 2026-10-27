import { randomBytes } from "node:crypto";
import { baseDados } from "@/server/db";

/** Correio das contas de demonstração (as mesmas do README). */
export const CONTAS = {
  admin: "admin@vagacerta.exemplo",
  supervisor: "supervisor@vagacerta.exemplo",
  azul: "azul@vagacerta.exemplo",
  vermelho: "vermelho@vagacerta.exemplo",
  verde: "verde@vagacerta.exemplo",
  tecnico: "tecnico.minho@vagacerta.exemplo",
} as const;

/** Abre uma sessão na base para esse utilizador e devolve o token do cookie `vc_sessao`. */
export function abrirSessao(email: string): string {
  const db = baseDados();
  const utilizador = db.prepare("SELECT id FROM utilizadores WHERE lower(email) = lower(?)").get(email) as
    | { id: string }
    | undefined;
  if (!utilizador) throw new Error(`Utilizador de teste inexistente: ${email}`);
  const token = randomBytes(32).toString("hex");
  const agora = new Date();
  db.prepare("INSERT INTO sessoes (token, utilizador_id, expira_em, criada_em) VALUES (?, ?, ?, ?)").run(
    token,
    utilizador.id,
    new Date(agora.getTime() + 8 * 60 * 60 * 1000).toISOString(),
    agora.toISOString(),
  );
  return token;
}

/** Pedido `Request` como o que o Next entrega a um route handler. */
export function pedido(metodo: string, caminho: string, corpo?: unknown, cabecalhos: Record<string, string> = {}): Request {
  const init: RequestInit = { method: metodo, headers: { ...cabecalhos } };
  if (corpo !== undefined) {
    init.body = JSON.stringify(corpo);
    (init.headers as Record<string, string>)["content-type"] = "application/json";
  }
  return new Request(`http://127.0.0.1:4472${caminho}`, init);
}

/** Segundo argumento dos route handlers dinâmicos (`params` é uma promessa, como no Next 16). */
export function contexto<T extends Record<string, string> = Record<string, string>>(params: T = {} as T) {
  return { params: Promise.resolve(params) };
}
