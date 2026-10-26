import { NextResponse } from "next/server";
import { esquemaEntrada } from "@/server/esquemas";
import { ErroHttp } from "@/server/erros";
import { lerJson } from "@/server/http";
import { mensagensDe, t } from "@/lib/i18n";
import { traduzirMensagem } from "@/lib/i18n/motor";
import { lerIdiomaPedido } from "@/server/idioma";
import { entrar } from "@/server/sessao";

async function credenciaisDe(pedido: Request) {
  const tipo = pedido.headers.get("content-type") ?? "";
  if (tipo.includes("application/json")) {
    return lerJson(esquemaEntrada, pedido);
  }
  const dados = await pedido.formData().catch(() => null);
  const analisado = esquemaEntrada.safeParse({
    email: dados?.get("email"),
    palavraPasse: dados?.get("palavraPasse"),
  });
  if (!analisado.success) {
    throw new ErroHttp(400, "DADOS_INVALIDOS", analisado.error.issues[0]?.message ?? "Os dados enviados não são válidos.");
  }
  return analisado.data;
}

function ePedidoJson(pedido: Request) {
  return (pedido.headers.get("content-type") ?? "").includes("application/json");
}

function redirecionar(pedido: Request, caminho: string) {
  const resposta = NextResponse.redirect(new URL(caminho, pedido.url), 303);
  resposta.headers.set("Location", caminho);
  return resposta;
}

export async function POST(pedido: Request) {
  const idioma = await lerIdiomaPedido();
  const mensagens = mensagensDe(idioma);
  try {
    const corpo = await credenciaisDe(pedido);
    const ator = await entrar(corpo.email, corpo.palavraPasse);
    if (!ator) {
      if (!ePedidoJson(pedido)) {
        return redirecionar(pedido, "/entrar?erro=credenciais");
      }
      return NextResponse.json(
        { codigo: "NAO_AUTENTICADO", mensagem: t(mensagens, "erros.credenciais") },
        { status: 401 },
      );
    }
    if (!ePedidoJson(pedido)) {
      return redirecionar(pedido, "/");
    }
    return NextResponse.json({ ator });
  } catch (erro) {
    if (erro instanceof ErroHttp) {
      if (!ePedidoJson(pedido)) {
        return redirecionar(pedido, "/entrar?erro=dados");
      }
      return NextResponse.json(
        { codigo: erro.codigo, mensagem: traduzirMensagem(mensagens, erro.message, erro.codigo) },
        { status: erro.status },
      );
    }
    console.error(erro);
    if (!ePedidoJson(pedido)) {
      return redirecionar(pedido, "/entrar?erro=servidor");
    }
    return NextResponse.json({ codigo: "ERRO_INTERNO", mensagem: t(mensagens, "erros.ERRO_INTERNO") }, { status: 500 });
  }
}
