import { describe, expect, it } from "vitest";
import { SEMENTE_GEMEO } from "@/lib/contratos/gemeo";
import { equipaCobre } from "@/lib/rules/dia";
import { parseHHMM } from "@/lib/rules/tempo";
import { resolverSequencia } from "@/lib/rules/viabilidade";
import { avaliarPolitica } from "@/lib/gemeo/avaliar";
import { correrSimulacao } from "@/lib/gemeo/correr";
import { FROTA_GEMEO } from "@/lib/gemeo/frota";
import { PEDIDO_OMISSAO } from "@/lib/gemeo/pedido";
import type { Chegada } from "@/lib/gemeo/gerar";

describe("caderno das três janelas", () => {
  it("o Verde FTTH das 08:00 cabe sozinho, mas não ao lado de Azul 10:00 e Vermelho 09:00", () => {
    const minho = FROTA_GEMEO.find((equipa) => equipa.id === "eq-a-minho")!;
    expect(equipaCobre(minho, "verde", "instalacao", "FTTH", "Braga")).toBe(true);
    const restricoes = {
      inicioTurno: parseHHMM("08:00"),
      fimTurno: parseHHMM("21:00"),
      blocos: [],
      margemDeslocacaoMin: 15,
    };
    const azul = { id: "az", janelaInicio: parseHHMM("10:00"), janelaFim: parseHHMM("12:00"), duracao: 180 };
    const vermelho = { id: "vr", janelaInicio: parseHHMM("09:00"), janelaFim: parseHHMM("12:00"), duracao: 155 };
    const verde = { id: "vd", janelaInicio: parseHHMM("08:00"), janelaFim: parseHHMM("13:00"), duracao: 130 };
    expect(resolverSequencia([verde], restricoes)).not.toBeNull();
    expect(resolverSequencia([azul, vermelho], restricoes)).not.toBeNull();
    expect(resolverSequencia([azul, vermelho, verde], restricoes)).toBeNull();
  });
});

describe("políticas no mesmo mundo pequeno", () => {
  const chegadas: Chegada[] = [
    {
      id: "az1",
      referencia: "AZ-0001",
      operadorId: "azul",
      categoria: "instalacao",
      tecnologia: null,
      area: "Braga",
      data: "2026-10-27",
      janelaInicio: "10:00",
      janelaFim: "12:00",
      duracaoMin: 180,
    },
    {
      id: "vr1",
      referencia: "VR-0002",
      operadorId: "vermelho",
      categoria: "instalacao",
      tecnologia: null,
      area: "Braga",
      data: "2026-10-27",
      janelaInicio: "09:00",
      janelaFim: "12:00",
      duracaoMin: 155,
    },
    {
      id: "vd1",
      referencia: "VD-0003",
      operadorId: "verde",
      categoria: "instalacao",
      tecnologia: "FTTH",
      area: "Braga",
      data: "2026-10-27",
      janelaInicio: "08:00",
      janelaFim: "13:00",
      duracaoMin: 130,
    },
  ];
  const mundo = {
    equipas: FROTA_GEMEO.filter((equipa) => equipa.id === "eq-a-minho").map((equipa) => ({
      ...equipa,
      indisponibilidades: [],
    })),
    ordens: [],
    margemDeslocacaoMin: 15,
    chegadas,
  };

  it("os calendários independentes aceitam as três e geram sobre-reserva; o registo único recusa o Verde na Minho", () => {
    const independente = avaliarPolitica(mundo, "independente");
    const partilhada = avaliarPolitica(mundo, "partilhada");
    expect(independente.aceites).toBe(3);
    expect(independente.sobreReservas).toBeGreaterThan(0);
    expect(partilhada.aceites).toBeLessThan(independente.aceites);
    expect(partilhada.sobreReservas).toBe(0);
    expect(partilhada.decisoes.get("vd1")).toBe("recusada");
    expect(independente.decisoes.get("vd1")).toBe("aceite");
  });

  it("o reencaixe aceita pelo menos o que o registo único aceita", () => {
    const partilhada = avaliarPolitica(mundo, "partilhada");
    const reencaixe = avaliarPolitica(mundo, "reencaixe");
    expect(reencaixe.aceites).toBeGreaterThanOrEqual(partilhada.aceites);
    expect(reencaixe.sobreReservas).toBe(0);
  });
});

describe("Monte Carlo", () => {
  it("a mesma semente reproduz o relatório", () => {
    const a = correrSimulacao({ ...PEDIDO_OMISSAO, replicas: 1, semanas: 1 });
    const b = correrSimulacao({ ...PEDIDO_OMISSAO, replicas: 1, semanas: 1 });
    expect(a.semente).toBe(SEMENTE_GEMEO);
    expect(a.ordensGeradas).toBe(b.ordensGeradas);
    expect(a.politicas.map((linha) => linha.aceites)).toEqual(b.politicas.map((linha) => linha.aceites));
    expect(a.politicas.map((linha) => linha.recusadas)).toEqual(b.politicas.map((linha) => linha.recusadas));
  });

  it("o registo único evita sobre-reservas em relação aos calendários independentes", () => {
    const relatorio = correrSimulacao({ ...PEDIDO_OMISSAO, replicas: 1, semanas: 1 });
    const independente = relatorio.politicas.find((linha) => linha.id === "independente")!;
    const partilhada = relatorio.politicas.find((linha) => linha.id === "partilhada")!;
    expect(partilhada.sobreReservasEvitadas).toBe(independente.sobreReservas - partilhada.sobreReservas);
    expect(partilhada.sobreReservas).toBeLessThanOrEqual(independente.sobreReservas);
    expect(relatorio.serieDiaria.length).toBe(5);
  });
});
