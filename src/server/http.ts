import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { eCentral, type Ator } from "@/lib/rules";
import { IDIOMA_OMISSAO, mensagensDe, t } from "@/lib/i18n";
import { traduzirMensagem } from "@/lib/i18n/motor";
import { ErroHttp, exigir } from "./erros";
import { comIdiomaAsync, lerIdiomaPedido } from "./idioma";
import { MENSAGEM_SO_CENTRAL_INTEGRACAO } from "./integracao-auth";
import { respostaSeSegredoOfscInvalido } from "./ofsc/segredo";
import { obterAtor } from "./sessao";

type Contexto = { params: Promise<Record<string, string>> };

function responderErroCom(erro: unknown, mensagens: ReturnType<typeof mensagensDe>) {
  if (erro instanceof ErroHttp) {
    return NextResponse.json(
      { codigo: erro.codigo, mensagem: traduzirMensagem(mensagens, erro.message, erro.codigo) },
      { status: erro.status },
    );
  }
  console.error(erro);
  return NextResponse.json({ codigo: "ERRO_INTERNO", mensagem: t(mensagens, "erros.ERRO_INTERNO") }, { status: 500 });
}

export function api<C extends Contexto = Contexto>(
  handler: (ator: Ator, pedido: Request, contexto: C) => Promise<unknown> | unknown,
) {
  return async (pedido: Request, contexto: C) => {
    const idioma = await lerIdiomaPedido();
    return comIdiomaAsync(idioma, async () => {
      const mensagens = mensagensDe(idioma);
      try {
        const ator = await obterAtor();
        if (!ator) {
          return NextResponse.json({ codigo: "NAO_AUTENTICADO", mensagem: t(mensagens, "erros.NAO_AUTENTICADO") }, { status: 401 });
        }
        const corpo = await handler(ator, pedido, contexto);
        return NextResponse.json(corpo ?? { ok: true });
      } catch (erro) {
        return responderErroCom(erro, mensagens);
      }
    });
  };
}

/** Como `api`, mas só a central (administrador e supervisor) passa; os outros perfis recebem 403. */
export function apiCentral<C extends Contexto = Contexto>(
  handler: (ator: Ator, pedido: Request, contexto: C) => Promise<unknown> | unknown,
) {
  return api<C>((ator, pedido, contexto) => {
    exigir(eCentral(ator), 403, "SEM_PERMISSAO", MENSAGEM_SO_CENTRAL_INTEGRACAO);
    return handler(ator, pedido, contexto);
  });
}

/**
 * Rotas do contrato OFSC (webhook e endpoints simulados): segredo partilhado PR#2
 * (`OFSC_WEBHOOK_SECRET` / `x-vagacerta-ofsc-secret`). Sem sessão de browser.
 * O `handler` pode devolver uma `Response` já pronta ou um corpo JSON.
 */
export function apiIntegracao<C extends Contexto = Contexto>(handler: (pedido: Request, contexto: C) => Promise<unknown> | unknown) {
  return async (pedido: Request, contexto: C) => {
    const idioma = await lerIdiomaPedido();
    return comIdiomaAsync(idioma, async () => {
      const mensagens = mensagensDe(idioma);
      try {
        const negado = respostaSeSegredoOfscInvalido(pedido);
        if (negado) return negado;
        const resposta = await handler(pedido, contexto);
        return resposta instanceof Response ? resposta : NextResponse.json(resposta ?? { ok: true });
      } catch (erro) {
        return responderErroCom(erro, mensagens);
      }
    });
  };
}

export async function publico(trabalho: () => Promise<unknown> | unknown) {
  const idioma = await lerIdiomaPedido();
  return comIdiomaAsync(idioma, async () => {
    const mensagens = mensagensDe(idioma);
    try {
      const corpo = await trabalho();
      return NextResponse.json(corpo ?? { ok: true });
    } catch (erro) {
      return responderErroCom(erro, mensagens);
    }
  });
}

export async function lerJson<T>(schema: ZodType<T>, pedido: Request): Promise<T> {
  const bruto = await pedido.json().catch(() => null);
  const resultado = schema.safeParse(bruto);
  if (!resultado.success) {
    const idioma = await lerIdiomaPedido();
    const mensagem = traduzirMensagem(
      mensagensDe(idioma),
      resultado.error.issues[0]?.message ?? t(mensagensDe(idioma), "validacao.dados"),
      "DADOS_INVALIDOS",
    );
    throw new ErroHttp(400, "DADOS_INVALIDOS", mensagem);
  }
  return resultado.data;
}

export function naoImplementado(contrato: string, mensagem?: string) {
  return NextResponse.json(
    {
      pronto: false,
      codigo: "NAO_IMPLEMENTADO",
      mensagem: mensagem ?? t(mensagensDe(IDIOMA_OMISSAO), "erros.NAO_IMPLEMENTADO"),
      contrato,
    },
    { status: 501 },
  );
}
