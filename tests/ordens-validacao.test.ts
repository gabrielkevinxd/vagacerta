import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ErroHttp } from "@/server/erros";
import { baseDados, lerMundo } from "@/server/db";
import { criarOrdem, obterAgenda, zonasDaArea, type NovaOrdem } from "@/server/servicos";
import { mensagensDe } from "@/lib/i18n";
import { traduzirMensagem } from "@/lib/i18n/motor";
import type { Ator } from "@/lib/rules";

const central: Ator = { id: "usr-admin", nome: "Teresa Varela", papel: "administrador", operadorId: null, tecnicoId: null, equipaId: null };
const despachanteAzul: Ator = { id: "usr-azul", nome: "Clara Monteiro", papel: "despachante", operadorId: "azul", tecnicoId: null, equipaId: null };

let seq = 0;
function nova(parcial: Partial<NovaOrdem> = {}): NovaOrdem {
  seq += 1;
  return {
    operadorId: "azul",
    referencia: `AZ-VAL${String(seq).padStart(3, "0")}-${crypto.randomUUID().slice(0, 6)}`,
    area: "Braga",
    zonaId: "0303",
    categoria: "instalacao",
    tecnologia: null,
    data: "2034-05-09",
    janelaInicio: "10:00",
    janelaFim: "12:00",
    prioridade: "media",
    clienteNome: "Cliente de teste",
    clienteContacto: "900 000 099",
    morada: "Rua Exemplo 99, Braga",
    nota: "",
    equipaId: null,
    modo: "pendente",
    ...parcial,
  };
}

function falha(trabalho: () => unknown): ErroHttp {
  try {
    trabalho();
  } catch (erro) {
    if (erro instanceof ErroHttp) return erro;
    throw erro;
  }
  throw new Error("Esperava-se um ErroHttp, mas a operação teve sucesso.");
}

describe("B3: a zona tem de ser coerente com a área", () => {
  beforeAll(() => {
    baseDados();
  });

  it("recusa uma zona que não serve a área, com uma mensagem clara e 400", () => {
    const erro = falha(() => criarOrdem(central, nova({ area: "Braga", zonaId: "1714" })));
    expect(erro.status).toBe(400);
    expect(erro.codigo).toBe("DADOS_INVALIDOS");
    expect(erro.message).toContain("Braga");
    expect(erro.message).toContain("1714");
    expect(erro.message).toContain("0303");
  });

  it("recusa a combinação incoerente também a um despachante e noutros modos", () => {
    const hoje = new Date();
    hoje.setUTCDate(hoje.getUTCDate() + 2);
    for (const modo of ["agendar", "espera", "pendente"] as const) {
      const erro = falha(() => criarOrdem(despachanteAzul, nova({ area: "Viseu", zonaId: "0105", modo, data: hoje.toISOString().slice(0, 10) })));
      expect(erro.status).toBe(400);
      expect(erro.message).toContain("Viseu");
    }
  });

  it("recusa uma zona que não existe sem rebentar (400, não 500)", () => {
    const erro = falha(() => criarOrdem(central, nova({ zonaId: "zn-inexistente" })));
    expect(erro.status).toBe(400);
  });

  it("aceita as zonas que servem a área (Braga=0303; Chaves via Douro/Barroso)", () => {
    expect(criarOrdem(central, nova({ area: "Braga", zonaId: "0303" })).zonaId).toBe("0303");
    expect(criarOrdem(central, nova({ area: "Chaves", zonaId: "1703" })).zonaId).toBe("1703");
    // Equipas Douro (vigência Vila Real) e Barroso (Montalegre) cobrem Chaves → zonas alternativas
    expect(zonasDaArea("Chaves")).toEqual(expect.arrayContaining(["1703", "1714", "1706"]));
    expect(criarOrdem(central, nova({ area: "Chaves", zonaId: "1714" })).zonaId).toBe("1714");
    expect(criarOrdem(central, nova({ area: "Chaves", zonaId: "1706" })).zonaId).toBe("1706");
  });

  it("recusa Chaves na zona de Braga", () => {
    expect(falha(() => criarOrdem(central, nova({ area: "Chaves", zonaId: "0303" }))).status).toBe(400);
  });

  it("a mensagem traduz-se para inglês com a zona e a área", () => {
    const erro = falha(() => criarOrdem(central, nova({ area: "Braga", zonaId: "1714" })));
    const emIngles = traduzirMensagem(mensagensDe("en"), erro.message, erro.codigo);
    expect(emIngles).not.toBe(erro.message);
    expect(emIngles).toContain("Braga");
    expect(emIngles).toContain("1714");
    expect(emIngles).toMatch(/zone/i);
  });

  it("a primeira zona de cada área é a predefinida do formulário, e todas as ordens da semente são coerentes", () => {
    expect(zonasDaArea("Braga")[0]).toBe("0303");
    expect(zonasDaArea("Guimarães")).toContain("0308");
    expect(zonasDaArea("Aveiro")[0]).toBe("0105");
    expect(zonasDaArea("Aveiro")).toContain("0105");
    for (const ordem of lerMundo().ordens) {
      expect(zonasDaArea(ordem.area), `${ordem.referencia}: ${ordem.area} / ${ordem.zonaId}`).toContain(ordem.zonaId);
    }
  });
});

describe("B6: códigos de erro coerentes com o contrato do README", () => {
  beforeAll(() => {
    baseDados();
  });

  it("REFERENCIA_DUPLICADA responde 409 em todos os modos (agendar, espera, pendente)", () => {
    for (const modo of ["agendar", "espera", "pendente"] as const) {
      const base = nova({ modo, data: modo === "agendar" ? "2034-06-13" : "2034-06-14" });
      criarOrdem(central, base);
      const erro = falha(() => criarOrdem(central, { ...base }));
      expect(erro.status, `modo ${modo}`).toBe(409);
      expect(erro.codigo, `modo ${modo}`).toBe("REFERENCIA_DUPLICADA");
    }
  });

  it("dia passado para um despachante: PASSADO (400)", () => {
    const erro = falha(() => criarOrdem(despachanteAzul, nova({ data: "2020-01-06" })));
    expect(erro.status).toBe(400);
    expect(erro.codigo).toBe("PASSADO");
    expect(traduzirMensagem(mensagensDe("en"), erro.message, erro.codigo)).toMatch(/past/i);
  });

  it("intervalo da agenda com mais de 15 dias, ou invertido: INTERVALO (400)", () => {
    const longo = falha(() => obterAgenda(central, "2034-01-02", "2034-02-28"));
    expect(longo.status).toBe(400);
    expect(longo.codigo).toBe("INTERVALO");
    const invertido = falha(() => obterAgenda(central, "2034-01-10", "2034-01-02"));
    expect(invertido.codigo).toBe("INTERVALO");
  });

  it("datas mal formadas continuam a dar DATA_INVALIDA", () => {
    expect(falha(() => obterAgenda(central, "ontem", "hoje")).codigo).toBe("DATA_INVALIDA");
  });

  it("o horizonte do despachante continua a dar HORIZONTE", () => {
    const erro = falha(() => criarOrdem(despachanteAzul, nova({ data: "2099-01-05" })));
    expect(erro.codigo).toBe("HORIZONTE");
  });
});
