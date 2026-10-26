import { duracaoMinutos, FOLGA_OPCIONAL_MIN, janelasDe } from "./catalogo";
import { ordensDoDia, restricoesDaEquipa, trabalhoDaOrdem } from "./dia";
import { parseHHMM } from "./tempo";
import type { Equipa, Mundo, Trabalho } from "./tipos";
import { resolverSequencia } from "./viabilidade";

export type EstadoVaga = "disponivel" | "opcional" | "indisponivel";

export interface ConsultaVaga {
  operadorId: Mundo["ordens"][number]["operadorId"];
  data: string;
  area: string;
  categoria: Mundo["ordens"][number]["categoria"];
  tecnologia: Mundo["ordens"][number]["tecnologia"];
}

export interface EstadoEquipaNaVaga {
  equipaId: string;
  nome: string;
  estado: EstadoVaga;
  folgaMin: number | null;
  motivo: "viavel" | "apertada" | "inviavel" | "fora_de_turno" | null;
}

export interface VagaPublicada {
  id: string;
  codigo: string;
  inicio: string;
  fim: string;
  duracaoMin: number;
  estado: EstadoVaga;
  equipasLivres: number;
  folgaMin: number | null;
  equipas: EstadoEquipaNaVaga[];
}

export interface PublicacaoVagas {
  operadorId: ConsultaVaga["operadorId"];
  data: string;
  area: string;
  categoria: ConsultaVaga["categoria"];
  tecnologia: ConsultaVaga["tecnologia"];
  duracaoMin: number | null;
  margemDeslocacaoMin: number;
  janelas: VagaPublicada[];
}

const PASSO_MIN = 5;

function nivel(estado: EstadoVaga): number {
  if (estado === "disponivel") return 2;
  if (estado === "opcional") return 1;
  return 0;
}

function classificar(
  existentes: Trabalho[],
  candidato: Trabalho,
  restricoes: NonNullable<ReturnType<typeof restricoesDaEquipa>>,
): Pick<EstadoEquipaNaVaga, "estado" | "folgaMin" | "motivo"> {
  const aberto = resolverSequencia([...existentes, candidato], restricoes);
  if (!aberto) return { estado: "indisponivel", folgaMin: null, motivo: "inviavel" };

  const limite = Math.min(candidato.janelaFim, restricoes.fimTurno - candidato.duracao);
  const amostras: number[] = [];
  for (let instante = candidato.janelaInicio; instante <= limite; instante += PASSO_MIN) amostras.push(instante);
  if (limite >= candidato.janelaInicio && (amostras.length === 0 || amostras[amostras.length - 1] !== limite)) {
    amostras.push(limite);
  }
  const escolhido = aberto.find((linha) => linha.id === candidato.id);
  if (escolhido) amostras.push(escolhido.inicio);

  let primeiro: number | null = null;
  let ultimo: number | null = null;
  const vistos = new Set<number>();
  for (const instante of amostras) {
    if (vistos.has(instante) || instante < candidato.janelaInicio || instante > limite) continue;
    vistos.add(instante);
    const fixado: Trabalho = { ...candidato, janelaInicio: instante, janelaFim: instante };
    if (!resolverSequencia([...existentes, fixado], restricoes)) continue;
    if (primeiro === null || instante < primeiro) primeiro = instante;
    if (ultimo === null || instante > ultimo) ultimo = instante;
    if (primeiro !== null && ultimo !== null && ultimo - primeiro > FOLGA_OPCIONAL_MIN) {
      return { estado: "disponivel", folgaMin: ultimo - primeiro, motivo: "viavel" };
    }
  }

  if (primeiro === null || ultimo === null) return { estado: "opcional", folgaMin: 0, motivo: "apertada" };
  const folgaMin = ultimo - primeiro;
  if (folgaMin <= FOLGA_OPCIONAL_MIN) return { estado: "opcional", folgaMin, motivo: "apertada" };
  return { estado: "disponivel", folgaMin, motivo: "viavel" };
}

function capaz(equipa: Equipa, consulta: ConsultaVaga): boolean {
  if (!equipa.ativa || !equipa.areas.includes(consulta.area)) return false;
  const competencia = equipa.competencias.find((linha) => linha.operadorId === consulta.operadorId);
  if (!competencia || !competencia.categorias.includes(consulta.categoria)) return false;
  if (consulta.operadorId === "verde") {
    if (!consulta.tecnologia || !competencia.tecnologias.includes(consulta.tecnologia)) return false;
  }
  return true;
}

export function proporVagas(mundo: Mundo, consulta: ConsultaVaga): PublicacaoVagas {
  const duracaoMin = duracaoMinutos(consulta.operadorId, consulta.categoria, consulta.tecnologia);
  const catalogo = janelasDe(consulta.operadorId, consulta.categoria);
  const equipas = mundo.equipas.filter((equipa) => capaz(equipa, consulta));

  const janelas: VagaPublicada[] = catalogo.map((janela) => {
    const linhas: EstadoEquipaNaVaga[] = equipas.map((equipa) => {
      const restricoes = restricoesDaEquipa(equipa, consulta.data, mundo.margemDeslocacaoMin);
      if (!restricoes || duracaoMin === null) {
        return { equipaId: equipa.id, nome: equipa.nome, estado: "indisponivel", folgaMin: null, motivo: "fora_de_turno" };
      }
      const existentes = ordensDoDia(mundo, equipa.id, consulta.data).map(trabalhoDaOrdem);
      const candidato: Trabalho = {
        id: `oferta-${janela.id}`,
        janelaInicio: parseHHMM(janela.inicio),
        janelaFim: parseHHMM(janela.fim),
        duracao: duracaoMin,
      };
      const classe = classificar(existentes, candidato, restricoes);
      return { equipaId: equipa.id, nome: equipa.nome, ...classe };
    });
    const estado = linhas.reduce<EstadoVaga>(
      (melhor, linha) => (nivel(linha.estado) > nivel(melhor) ? linha.estado : melhor),
      "indisponivel",
    );
    const livres = linhas.filter((linha) => linha.estado !== "indisponivel");
    const folgaMin = livres.reduce<number | null>((maior, linha) => {
      if (linha.folgaMin === null) return maior;
      if (maior === null || linha.folgaMin > maior) return linha.folgaMin;
      return maior;
    }, null);
    return {
      id: janela.id,
      codigo: janela.codigo,
      inicio: janela.inicio,
      fim: janela.fim,
      duracaoMin: duracaoMin ?? 0,
      estado: linhas.length === 0 ? "indisponivel" : estado,
      equipasLivres: livres.length,
      folgaMin,
      equipas: linhas,
    };
  });

  return {
    operadorId: consulta.operadorId,
    data: consulta.data,
    area: consulta.area,
    categoria: consulta.categoria,
    tecnologia: consulta.tecnologia,
    duracaoMin,
    margemDeslocacaoMin: mundo.margemDeslocacaoMin,
    janelas,
  };
}
