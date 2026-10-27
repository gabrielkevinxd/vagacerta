import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { criarMundoDemonstracao, equipasDemonstracao } from "@/lib/demonstracao";
import { equipaCobre, marcarOrdem } from "@/lib/rules/dia";
import { competenciasDeOperadores, validarOperadoresServidos } from "@/lib/rules/operadores-servidos";
import { reencaixar } from "@/lib/rules/reencaixe";
import type { Ator, Equipa, Mundo } from "@/lib/rules";
import { ErroHttp } from "@/server/erros";
import { baseDados, lerMundo } from "@/server/db";
import { criarOrdem, guardarEquipa, type NovaOrdem } from "@/server/servicos";
import { gerarEquipasExtra } from "@/lib/zonas/frota-seed";

const central: Ator = {
  id: "usr-admin",
  nome: "Teresa Varela",
  papel: "administrador",
  operadorId: null,
  tecnicoId: null,
  equipaId: null,
};

function falha(trabalho: () => unknown): ErroHttp {
  try {
    trabalho();
  } catch (erro) {
    if (erro instanceof ErroHttp) return erro;
    throw erro;
  }
  throw new Error("Esperava-se ErroHttp");
}

describe("operadoresServidos", () => {
  it("default das 7 de demonstração = os 3 operadores", () => {
    for (const equipa of equipasDemonstracao("2030-06-03")) {
      expect(equipa.operadoresServidos).toEqual(["azul", "vermelho", "verde"]);
      expect(equipa.competencias.map((c) => c.operadorId)).toEqual(["azul", "vermelho", "verde"]);
    }
  });

  it("0 operadores → erro de validação", () => {
    const vazio = validarOperadoresServidos([]);
    expect("ok" in vazio && vazio.ok === false).toBe(true);
    if ("ok" in vazio) expect(vazio.codigo).toBe("OPERADORES_SERVIDOS");
  });

  it("equipa de 1 operador recusa o outro", () => {
    const soAzul: Equipa = {
      ...equipasDemonstracao("2030-06-03")[0]!,
      id: "eq-so-azul",
      operadoresServidos: ["azul"],
      competencias: competenciasDeOperadores(["azul"]),
    };
    expect(equipaCobre(soAzul, "azul", "instalacao", null, "Braga")).toBe(true);
    expect(equipaCobre(soAzul, "vermelho", "instalacao", null, "Braga")).toBe(false);
    const mundo: Mundo = { equipas: [soAzul], ordens: [], margemDeslocacaoMin: 15 };
    const recusa = marcarOrdem(mundo, {
      operadorId: "vermelho",
      referencia: "VR-SOLO",
      area: "Braga",
      zonaId: "0303",
      categoria: "instalacao",
      data: "2030-06-03",
      janelaInicio: "09:00",
      janelaFim: "12:00",
      prioridade: "media",
      clienteNome: "Cliente",
      clienteContacto: "900000000",
      morada: "Rua 1",
      equipaId: "eq-so-azul",
    });
    expect(recusa.ok).toBe(false);
    if (!recusa.ok) expect(recusa.codigo).toBe("OPERADOR_NAO_SERVIDO");
  });

  it("semente extra: maioria serve 3; há 1 e 2; total 193", () => {
    const extras = gerarEquipasExtra(193);
    expect(extras).toHaveLength(193);
    const contagens = extras.map((e) => e.equipa.operadoresServidos.length);
    expect(contagens.filter((n) => n === 3).length).toBeGreaterThan(110);
    expect(contagens.some((n) => n === 1)).toBe(true);
    expect(contagens.some((n) => n === 2)).toBe(true);
    expect(contagens.every((n) => n >= 1 && n <= 3)).toBe(true);
  });
});

describe("operadoresServidos na base", () => {
  beforeAll(() => {
    baseDados();
  });

  it("200 equipas na semente; as 7 demo servem os 3", () => {
    const mundo = lerMundo();
    expect(mundo.equipas).toHaveLength(200);
    for (const id of ["eq-minho", "eq-ave", "eq-cavado", "eq-douro", "eq-beiras", "eq-litoral", "eq-barroso"]) {
      const equipa = mundo.equipas.find((e) => e.id === id)!;
      expect(equipa.operadoresServidos).toEqual(["azul", "vermelho", "verde"]);
    }
  });

  it("409 ao remover operador com ordens futuras", () => {
    const erro = falha(() => guardarEquipa(central, "eq-minho", { operadoresServidos: ["azul"] }));
    expect(erro.status).toBe(409);
    expect(erro.codigo).toBe("OPERADOR_COM_ORDENS");
    expect(erro.message).toMatch(/VR-90001|AZ-24081|VR-CANC|AZ-24160|VR-88420/);
  });

  it("duas reservas FCFS do mesmo intervalo: só uma ganha", () => {
    // Turno curto na Equipa Ave → uma instalação azul de 3 h esgota a manhã; a vermelha no mesmo intervalo perde.
    const data = "2035-03-13";
    guardarEquipa(central, "eq-ave", {
      horarios: [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio: "08:00", fim: "12:00" })),
    });
    const base: NovaOrdem = {
      operadorId: "azul",
      referencia: `AZ-RACE-${crypto.randomUUID().slice(0, 6)}`,
      area: "Guimarães",
      zonaId: "0308",
      categoria: "instalacao",
      tecnologia: null,
      data,
      janelaInicio: "08:00",
      janelaFim: "10:00",
      prioridade: "alta",
      clienteNome: "Primeiro",
      clienteContacto: "900111111",
      morada: "Rua Race 1, Guimarães",
      nota: "",
      equipaId: "eq-ave",
      modo: "agendar",
    };
    const primeira = criarOrdem(central, base);
    expect(primeira.equipaId).toBe("eq-ave");
    const segunda = falha(() =>
      criarOrdem(central, {
        ...base,
        operadorId: "vermelho",
        referencia: `VR-RACE-${crypto.randomUUID().slice(0, 6)}`,
        janelaInicio: "09:00",
        janelaFim: "12:00",
        clienteNome: "Segundo",
      }),
    );
    expect(segunda.status).toBe(409);
    expect(["SLOT_OCUPADO", "INVIAVEL"]).toContain(segunda.codigo);
    expect(segunda.message.toLowerCase()).toMatch(/alternativ|reservado|sequência|inviável|interval/);
  });

  it("reencaixe não coloca ordem azul numa equipa que só serve vermelho", () => {
    const dia = "2030-06-03";
    const mundo = criarMundoDemonstracao(dia);
    const soVermelho: Equipa = {
      ...mundo.equipas.find((e) => e.id === "eq-ave")!,
      id: "eq-so-vr",
      nome: "Só Vermelho",
      areas: ["Braga", "Guimarães"],
      operadoresServidos: ["vermelho"],
      competencias: competenciasDeOperadores(["vermelho"]),
    };
    const isolado: Mundo = {
      ...mundo,
      equipas: mundo.equipas.map((e) => (e.id === "eq-ave" ? soVermelho : e)).concat(),
    };
    // substitui Ave pela variante só-vermelho
    isolado.equipas = [...mundo.equipas.filter((e) => e.id !== "eq-ave"), soVermelho];
    const urgente = isolado.ordens.find((o) => o.referencia === "VD-URG")!;
    const plano = reencaixar(isolado, { encaixarId: urgente.id, permitirTroca: true });
    expect(
      plano.movimentos.every((m) => m.paraEquipaId !== "eq-so-vr" || m.referencia.startsWith("VR")),
    ).toBe(true);
    // Verde nunca vai para eq-so-vr
    expect(plano.movimentos.some((m) => m.referencia === "VD-URG" && m.paraEquipaId === "eq-so-vr")).toBe(false);
  });
});
