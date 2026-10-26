import { describe, expect, it } from "vitest";
import { duracaoMinutos } from "@/lib/rules/catalogo";
import { parseHHMM } from "@/lib/rules/tempo";
import type { Restricoes, Trabalho } from "@/lib/rules/tipos";
import { inicioMaisCedo, resolverSequencia, sequenciaViavel } from "@/lib/rules/viabilidade";

function trabalho(id: string, inicio: string, fim: string, duracao: number): Trabalho {
  return { id, janelaInicio: parseHHMM(inicio), janelaFim: parseHHMM(fim), duracao };
}

function turno(
  margem: number,
  inicio = "08:00",
  fim = "21:00",
  blocos: { inicio: string; fim: string }[] = [],
): Restricoes {
  return {
    inicioTurno: parseHHMM(inicio),
    fimTurno: parseHHMM(fim),
    margemDeslocacaoMin: margem,
    blocos: blocos.map((bloco) => ({ inicio: parseHHMM(bloco.inicio), fim: parseHHMM(bloco.fim) })),
  };
}

describe("exemplo do enunciado: instalação azul das 10:00 a ocupar até às 13:00", () => {
  const duracaoAzul = duracaoMinutos("azul", "instalacao", null)!;
  const duracaoVermelho = duracaoMinutos("vermelho", "instalacao", null)!;
  const duracaoVerde = duracaoMinutos("verde", "instalacao", "FTTH")!;
  const azul = trabalho("azul", "10:00", "12:00", duracaoAzul);
  const vermelho = trabalho("vermelho", "09:00", "12:00", duracaoVermelho);
  const verde = trabalho("verde", "08:00", "13:00", duracaoVerde);

  it("começa a instalação azul sozinha às 10:00 e ocupa a equipa até às 13:00", () => {
    expect(duracaoAzul).toBe(180);
    expect(duracaoVermelho).toBe(155);
    expect(duracaoVerde).toBe(130);
    const plano = resolverSequencia([azul], turno(15));
    expect(plano).toEqual([{ id: "azul", inicio: parseHHMM("10:00"), fim: parseHHMM("13:00") }]);
  });

  it("ainda aceita o vermelho das 09:00–12:00 quando o início azul pode deslizar dentro da janela", () => {
    const plano = resolverSequencia([azul, vermelho], turno(15));
    expect(plano).not.toBeNull();
    const planoVermelho = plano!.find((linha) => linha.id === "vermelho")!;
    const planoAzul = plano!.find((linha) => linha.id === "azul")!;
    expect(planoVermelho.inicio).toBeGreaterThanOrEqual(parseHHMM("09:00"));
    expect(planoVermelho.inicio).toBeLessThanOrEqual(parseHHMM("12:00"));
    expect(planoAzul.inicio).toBeGreaterThanOrEqual(parseHHMM("10:00"));
    expect(planoAzul.inicio).toBeLessThanOrEqual(parseHHMM("12:00"));
    expect(planoAzul.inicio).toBeGreaterThanOrEqual(planoVermelho.fim + 15);
    expect(sequenciaViavel([azul, verde], turno(15))).toBe(true);
    expect(sequenciaViavel([azul, verde], turno(30))).toBe(true);
  });

  it("recusa o vermelho das 09:00–12:00 quando a margem de 30 minutos não deixa sequência", () => {
    expect(sequenciaViavel([azul, vermelho], turno(30))).toBe(false);
  });

  it("recusa as três ordens juntas — o caso em que calendários separados sobre-reservariam a equipa", () => {
    expect(sequenciaViavel([azul, vermelho, verde], turno(0))).toBe(false);
    expect(sequenciaViavel([azul, vermelho, verde], turno(15))).toBe(false);
  });

  it("recusa as janelas sobrepostas quando o início azul fica fixo às 10:00", () => {
    const fixado = trabalho("azul", "10:00", "10:00", duracaoAzul);
    expect(resolverSequencia([fixado], turno(0))).toEqual([
      { id: "azul", inicio: parseHHMM("10:00"), fim: parseHHMM("13:00") },
    ]);
    expect(sequenciaViavel([fixado, vermelho], turno(0))).toBe(false);
    expect(sequenciaViavel([fixado, verde], turno(15))).toBe(false);
    expect(sequenciaViavel([fixado, vermelho], turno(15))).toBe(false);
  });
});

describe("a ocupação não é a janela", () => {
  it("deixa o trabalho terminar depois do fim da janela de início", () => {
    const plano = resolverSequencia([trabalho("azul", "10:00", "12:00", 180)], turno(0))!;
    expect(plano[0].fim).toBe(parseHHMM("13:00"));
    expect(plano[0].fim).toBeGreaterThan(parseHHMM("12:00"));
  });

  it("respeita indisponibilidade e o fim do turno", () => {
    const suporte = trabalho("avaria", "08:00", "12:30", 45);
    const plano = resolverSequencia(
      [suporte],
      turno(0, "08:00", "18:00", [{ inicio: "08:00", fim: "12:00" }]),
    )!;
    expect(plano[0].inicio).toBeGreaterThanOrEqual(parseHHMM("12:00"));
    const instalacaoTarde = trabalho("tarde", "17:30", "20:30", 180);
    expect(sequenciaViavel([instalacaoTarde], turno(0, "08:00", "18:00"))).toBe(false);
    expect(sequenciaViavel([instalacaoTarde], turno(0, "08:00", "21:00"))).toBe(true);
  });

  it("não põe margem de deslocação antes do primeiro trabalho", () => {
    const plano = resolverSequencia([trabalho("primeiro", "08:00", "10:00", 60)], turno(30))!;
    expect(inicioMaisCedo(trabalho("primeiro", "08:00", "10:00", 60), parseHHMM("08:00"), turno(30))).toBe(
      parseHHMM("08:00"),
    );
    expect(plano[0].inicio).toBe(parseHHMM("08:00"));
  });
});
