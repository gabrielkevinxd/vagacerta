import { describe, expect, it } from "vitest";
import { prepararContexto, resumoCompacto, detetarFactos, type ContagemTecnicos } from "@/lib/assistente/analise";
import { descreverAlertas } from "@/lib/assistente/frases";
import { responderPorRegras } from "@/lib/assistente/regras";
import { criarMundoDemonstracao } from "@/lib/demonstracao";
import { ptPT, t } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";
import type { Ator, Equipa, Mundo, Ordem } from "@/lib/rules";

const DATA = "2026-10-27";

const despachanteAzul: Ator = {
  id: "usr-azul",
  nome: "Clara Monteiro",
  papel: "despachante",
  operadorId: "azul",
  tecnicoId: null,
  equipaId: null,
};

const central: Ator = {
  id: "usr-central",
  nome: "Ana Central",
  papel: "administrador",
  operadorId: null,
  tecnicoId: null,
  equipaId: null,
};

const tecnico: Ator = {
  id: "usr-tecnico",
  nome: "Rui Salgado",
  papel: "tecnico",
  operadorId: null,
  tecnicoId: "tec-rui",
  equipaId: "eq-minho",
};

function equipa(parcial: Partial<Equipa> & Pick<Equipa, "id" | "nome">): Equipa {
  return {
    codigo: parcial.id,
    base: "Teste",
    areas: ["Braga"],
    ativa: true,
    competencias: [],
    horarios: [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio: "08:00", fim: "18:00" })),
    indisponibilidades: [],
    ...parcial,
  };
}

function ordem(parcial: Partial<Ordem> & Pick<Ordem, "id" | "referencia" | "operadorId">): Ordem {
  return {
    area: "Braga",
    zonaId: "zn-n01",
    equipaId: "eq",
    categoria: "instalacao",
    tecnologia: null,
    data: DATA,
    janelaInicio: "08:00",
    janelaFim: "18:00",
    duracaoMin: 60,
    prioridade: "media",
    estado: "agendada",
    inicioPlaneado: null,
    fimPlaneado: null,
    inicioFixado: false,
    clienteNome: "Cliente Oculto",
    clienteContacto: "900000000",
    morada: "Rua Oculta 1",
    nota: "",
    motivoCancelamento: null,
    quemPediu: null,
    ...parcial,
  };
}

describe("alertas do assistente", () => {
  it("o despachante azul não vê fichas nem referências dos outros", () => {
    const mundo = criarMundoDemonstracao();
    const ctx = prepararContexto(mundo, despachanteAzul, DATA);
    const texto = JSON.stringify({
      factos: ctx.factos,
      resumo: resumoCompacto(ctx),
      alertas: descreverAlertas(ptPT, ctx.factos),
    });
    expect(texto).toContain("AZ-FILA-01");
    expect(texto).toContain("AZ-PEND-01");
    expect(texto).not.toContain("VR-");
    expect(texto).not.toContain("VD-");
    expect(texto).not.toContain("Duarte");
    expect(texto).not.toContain("Matilde");
    expect(texto).not.toContain("Leonor");
    expect(ctx.factos.some((facto) => facto.tipo === "sem_tecnico")).toBe(true);
    expect(ctx.factos.some((facto) => facto.tipo === "tecnico_ausente" && facto.equipaId === "eq-cavado")).toBe(true);
  });

  it("deteta sobreposição, quota esgotada, sobrelotação e falta do turno", () => {
    const mundo: Mundo = {
      margemDeslocacaoMin: 15,
      equipas: [
        equipa({
          id: "eq",
          nome: "Equipa Teste",
          indisponibilidades: [{ id: "un", data: DATA, inicio: "08:00", fim: "18:00", motivo: "Baixa" }],
        }),
      ],
      ordens: [
        ordem({ id: "a", referencia: "AZ-1", operadorId: "azul", inicioPlaneado: "08:00", fimPlaneado: "10:00", duracaoMin: 120 }),
        ordem({ id: "b", referencia: "AZ-2", operadorId: "azul", inicioPlaneado: "09:30", fimPlaneado: "11:00", duracaoMin: 90 }),
        ordem({ id: "c", referencia: "AZ-3", operadorId: "azul", inicioPlaneado: "12:00", fimPlaneado: "19:00", duracaoMin: 420 }),
        ordem({ id: "d", referencia: "AZ-4", operadorId: "azul", estado: "em_espera", equipaId: null, clienteNome: "Diana" }),
      ],
    };
    const factos = detetarFactos(mundo, central, DATA);
    expect(factos.some((facto) => facto.tipo === "sobreposicao" && facto.referencia?.includes("AZ-1"))).toBe(true);
    expect(factos.some((facto) => facto.tipo === "quota_esgotada")).toBe(true);
    expect(factos.some((facto) => facto.tipo === "sobrelotacao")).toBe(true);
    const falta = factos.find((facto) => facto.tipo === "tecnico_ausente");
    expect(falta?.total).toBe(true);
    expect(falta?.pedido).toMatchObject({ equipaEmFalta: "eq", data: DATA });
    expect(detetarFactos(mundo, despachanteAzul, DATA).find((facto) => facto.tipo === "tecnico_ausente")?.pedido).toBeUndefined();
    const frases = descreverAlertas(en, factos);
    expect(frases.map((alerta) => alerta.detalhe).join(" ")).toContain("AZ-4");
    expect(t(en, "assistente.tipos.sobreposicao")).toBe("Overlap");
  });

  it("técnico sem ativos e o técnico de campo só vê a sua equipa", () => {
    const mundo = criarMundoDemonstracao();
    const tecnicos: ContagemTecnicos[] = [{ equipaId: "eq-minho", ativos: 0 }];
    const doTecnico = detetarFactos(mundo, tecnico, DATA, tecnicos);
    expect(doTecnico.every((facto) => facto.equipaId === "eq-minho" || facto.tipo === "sem_tecnico")).toBe(true);
    expect(doTecnico.some((facto) => facto.equipaId === "eq-cavado")).toBe(false);
    expect(doTecnico.some((facto) => facto.tipo === "sem_tecnico")).toBe(false);
    expect(doTecnico.some((facto) => facto.tipo === "tecnico_ausente" && facto.motivo === "sem_tecnicos")).toBe(true);
    expect(doTecnico.find((facto) => facto.tipo === "tecnico_ausente")?.pedido).toBeUndefined();
  });
});

describe("regras do assistente", () => {
  const ctxAzul = () => prepararContexto(criarMundoDemonstracao(), despachanteAzul, DATA);
  const ctxCentral = () => prepararContexto(criarMundoDemonstracao(), central, DATA);

  it("responde a perguntas frequentes e não grava por uma frase", () => {
    expect(responderPorRegras("Que conflitos há hoje?", ctxAzul()).tipo).toBe("esclarecer");
    const quotas = responderPorRegras("How are the quotas and slots?", ctxAzul());
    expect(quotas.tipo).toBe("esclarecer");
    if (quotas.tipo === "esclarecer") {
      expect(["assistente.quotas", "assistente.quotasLivres"]).toContain(quotas.chave);
      expect(JSON.stringify(quotas.vars ?? {})).not.toContain("VR-");
    }
    expect(responderPorRegras("confirm", ctxAzul())).toMatchObject({ chave: "assistente.precisaBotao" });
    expect(responderPorRegras("Encaixa a AZ-FILA-01", ctxAzul())).toMatchObject({
      tipo: "reencaixar",
      pedido: { encaixarId: "ord-az-fila-01", permitirTroca: false },
    });
    expect(responderPorRegras("Suggest a refit to balance the load.", ctxCentral())).toMatchObject({
      tipo: "reencaixar",
      pedido: { encaixarId: "ord-vd-urg", permitirTroca: true },
    });
    expect(responderPorRegras("falta da equipa minho", ctxAzul())).toMatchObject({ tipo: "recusar", chave: "assistente.soCentralFalta" });
    expect(responderPorRegras("balance the teams", prepararContexto(criarMundoDemonstracao(), tecnico, DATA))).toMatchObject({
      tipo: "recusar",
      chave: "assistente.tecnicoNaoGrava",
    });
  });
});
