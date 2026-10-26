import { traduzir } from "@/lib/i18n";
import { CATEGORIAS, COR_OPERADOR, JANELAS_INICIO, OPERADORES, TECNOLOGIAS } from "@/lib/rules";
import { api } from "@/server/http";
import { idiomaAtual } from "@/server/idioma";

export const GET = api(async () => ({
  operadores: OPERADORES.map((id) => ({ id, nome: traduzir(idiomaAtual(), `operador.${id}`), cor: COR_OPERADOR[id] })),
  categorias: CATEGORIAS,
  tecnologias: TECNOLOGIAS,
  janelas: JANELAS_INICIO,
  nota: "A duração está em duracaoMinutos(operadorId, categoria, tecnologia). A janela é o intervalo em que o trabalho pode começar; a ocupação pode terminar depois.",
}));
