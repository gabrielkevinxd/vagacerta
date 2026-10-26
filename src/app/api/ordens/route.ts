import { esquemaNovaOrdem } from "@/server/esquemas";
import { api, lerJson } from "@/server/http";
import { criarOrdem, listarOrdens } from "@/server/servicos";

function ler(url: URL, nome: string): string | undefined {
  const valor = url.searchParams.get(nome);
  return valor && valor.length > 0 ? valor : undefined;
}

export const GET = api(async (ator, pedido) => {
  const url = new URL(pedido.url);
  return listarOrdens(ator, {
    estado: ler(url, "estado"),
    operador: ler(url, "operador"),
    data: ler(url, "data"),
    de: ler(url, "de"),
    ate: ler(url, "ate"),
    q: ler(url, "q"),
    equipaId: ler(url, "equipaId"),
  });
});

export const POST = api(async (ator, pedido) => {
  const corpo = await lerJson(esquemaNovaOrdem, pedido);
  return criarOrdem(ator, { ...corpo, equipaId: corpo.equipaId ?? null, nota: corpo.nota ?? "" });
});
