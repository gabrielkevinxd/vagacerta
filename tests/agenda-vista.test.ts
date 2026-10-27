import { describe, expect, it } from "vitest";
import { eixoDasLinhas, fundirAgenda, minutoNoEixo, moverBloco, percentagem } from "@/lib/agenda-vista";
import type { Agenda, LinhaVista } from "@/lib/rules/agenda";

function linha(parcial: Partial<LinhaVista> & Pick<LinhaVista, "equipaId" | "nome">): LinhaVista {
  return {
    codigo: parcial.equipaId,
    turno: { inicio: "08:00", fim: "18:00" },
    indisponibilidades: [],
    blocos: [],
    conflitos: [],
    ...parcial,
  };
}

function agenda(dias: Agenda["dias"]): Agenda {
  return { de: "2026-10-27", ate: "2026-10-28", margemDeslocacaoMin: 15, dias };
}

describe("escala da agenda", () => {
  it("abre o eixo à hora cheia e inclui turno, visitas e indisponibilidades", () => {
    const eixo = eixoDasLinhas([
      linha({
        equipaId: "eq",
        nome: "Minho",
        turno: { inicio: "08:30", fim: "17:30" },
        indisponibilidades: [{ inicio: "12:00", fim: "14:00", inicioMin: 12 * 60, fimMin: 14 * 60, motivo: "formação" }],
        blocos: [
          {
            id: "a",
            inicio: "09:00",
            fim: "12:00",
            inicioMin: 9 * 60,
            fimMin: 12 * 60,
            duracaoMin: 180,
            vista: "ocupada",
            arrastavel: false,
          },
        ],
      }),
    ]);
    // O eixo abre por omissão às 08:00–22:00 e alarga-se se o turno/blocos o pedirem.
    expect(eixo).toEqual({ inicioMin: 8 * 60, fimMin: 22 * 60 });
    expect(percentagem(8 * 60, eixo)).toBe(0);
    expect(percentagem(15 * 60, eixo)).toBe(50);
    expect(minutoNoEixo(0, eixo)).toBe(8 * 60);
    expect(minutoNoEixo(1, eixo)).toBe(22 * 60 - 5);
  });

  it("move o bloco de forma otimista e funde só os dias devolvidos pelo servidor", () => {
    const bloco = {
      id: "ord-1",
      inicio: "10:00",
      fim: "13:00",
      inicioMin: 600,
      fimMin: 780,
      duracaoMin: 180,
      vista: "completa" as const,
      arrastavel: true,
      referencia: "AZ-1",
    };
    const base = agenda([
      {
        data: "2026-10-27",
        equipas: [
          linha({ equipaId: "eq-a", nome: "A", blocos: [bloco], conflitos: [{ ordemId: "ord-1", tipo: "janela", mensagem: "fora" }] }),
          linha({ equipaId: "eq-b", nome: "B" }),
        ],
      },
      { data: "2026-10-28", equipas: [linha({ equipaId: "eq-a", nome: "A" })] },
    ]);
    const movida = moverBloco(base, "ord-1", { equipaId: "eq-b", data: "2026-10-27", inicioMin: 11 * 60 });
    const naOrigem = movida.dias[0]?.equipas[0]?.blocos ?? [];
    const noDestino = movida.dias[1] ? movida.dias[0]?.equipas[1]?.blocos : [];
    expect(naOrigem).toHaveLength(0);
    expect(movida.dias[0]?.equipas[0]?.conflitos).toHaveLength(0);
    expect(noDestino?.[0]?.inicio).toBe("11:00");
    expect(noDestino?.[0]?.fim).toBe("14:00");
    expect(movida.dias[1]?.equipas[0]?.blocos).toHaveLength(0);

    const parcial = agenda([
      {
        data: "2026-10-27",
        equipas: [linha({ equipaId: "eq-a", nome: "Servidor" })],
      },
    ]);
    parcial.de = "2026-10-27";
    parcial.ate = "2026-10-27";
    const fundida = fundirAgenda(base, parcial);
    expect(fundida.de).toBe("2026-10-27");
    expect(fundida.ate).toBe("2026-10-28");
    expect(fundida.dias[0]?.equipas[0]?.nome).toBe("Servidor");
    expect(fundida.dias[1]?.equipas[0]?.nome).toBe("A");
  });
});
