import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Consola/vagas/agente/reserva: central + despachante (só o próprio operador). Hub-only: cenários/saúde/reconciliar.
// Webhook e `/api/ofsc/*`: só `OFSC_WEBHOOK_SECRET` (PR#2) — sem sessão de browser.
const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nome: string) => (jar.has(nome) ? { name: nome, value: jar.get(nome)! } : undefined),
    set: (nome: string, valor: string) => void jar.set(nome, valor),
    delete: (nome: string) => void jar.delete(nome),
  }),
  headers: async () => new Headers(),
}));
vi.mock("next/server", async (importar) => ({
  ...(await importar<typeof import("next/server")>()),
  connection: async () => undefined,
}));

import { GET as consolaGET } from "@/app/api/integracao/consola/route";
import { POST as cenariosPOST } from "@/app/api/integracao/cenarios/route";
import { POST as reconciliarPOST } from "@/app/api/integracao/reconciliar/route";
import { POST as reservaPOST } from "@/app/api/integracao/reserva/route";
import { POST as saudePOST } from "@/app/api/integracao/saude/route";
import { POST as agentePOST } from "@/app/api/integracao/agente/route";
import { GET as vagasGET } from "@/app/api/integracao/vagas/route";
import { POST as eventosPOST } from "@/app/api/integracao/ofsc/eventos/route";
import { PATCH as atividadePATCH } from "@/app/api/ofsc/[operador]/activities/[activityId]/route";
import { POST as ausenciaPOST } from "@/app/api/ofsc/[operador]/resources/[resourceId]/absences/route";
import { DELETE as ausenciaDELETE, PATCH as ausenciaPATCH } from "@/app/api/ofsc/[operador]/resources/[resourceId]/absences/[id]/route";
import { baseDados } from "@/server/db";
import { diaSemanaIso, somarDias } from "@/lib/rules";
import { abrirSessao, CONTAS, contexto, pedido } from "./http-simulado";

const SEGREDO = `segredo-de-teste-${crypto.randomUUID()}`;
let diaSeq = 0;

function diaTeste(): string {
  diaSeq += 1;
  let data = somarDias("2032-03-01", diaSeq * 7);
  while (diaSemanaIso(data) > 5) data = somarDias(data, 1);
  return data;
}

function eventoValido() {
  return {
    eventType: "activityCreated",
    operator: "azul",
    activity: {
      activityId: `act-acesso-${crypto.randomUUID()}`,
      resourceId: "AZ_RES_LITORAL",
      bucket: "DST_TELECOM",
      status: "pending",
      date: diaTeste(),
      timeSlot: { start: "10:00", end: "12:00" },
      workZone: "0105",
      apptNumber: `AZ-ACE${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      tipoIntervencao: "instalacao",
      technician: "tec-helena",
      customerName: "Cliente de teste",
      streetAddress: "Rua Exemplo 1",
      city: "Aveiro",
      postalCode: "3800-001",
    },
  };
}

function contar(tabela: string): number {
  return Number((baseDados().prepare(`SELECT COUNT(*) AS n FROM ${tabela}`).get() as { n: number }).n);
}

function entrarComo(perfil: keyof typeof CONTAS | null) {
  jar.delete("vc_sessao");
  if (perfil) jar.set("vc_sessao", abrirSessao(CONTAS[perfil]));
}

async function corpo(resposta: Response): Promise<{ codigo?: string; mensagem?: string; [chave: string]: unknown }> {
  return (await resposta.json()) as { codigo?: string; mensagem?: string };
}

describe("integração: hub-only vs despachante com scope D1", () => {
  beforeAll(() => {
    baseDados();
  });
  beforeEach(() => {
    jar.clear();
  });

  const hubOnly: [string, () => Promise<Response>][] = [
    ["POST /api/integracao/cenarios", () => cenariosPOST(pedido("POST", "/api/integracao/cenarios", { id: "zona_fechada" }), contexto())],
    ["POST /api/integracao/reconciliar", () => reconciliarPOST(pedido("POST", "/api/integracao/reconciliar"), contexto())],
    ["POST /api/integracao/saude", () => saudePOST(pedido("POST", "/api/integracao/saude", { operadorId: "vermelho", emBaixo: false }), contexto())],
  ];

  for (const [nome, chamar] of hubOnly) {
    it(`${nome}: sem sessão dá 401`, async () => {
      entrarComo(null);
      const resposta = await chamar();
      expect(resposta.status).toBe(401);
      expect((await corpo(resposta)).codigo).toBe("NAO_AUTENTICADO");
    });

    for (const perfil of ["azul", "vermelho", "verde", "tecnico"] as const) {
      it(`${nome}: o perfil ${perfil} recebe 403`, async () => {
        entrarComo(perfil);
        const resposta = await chamar();
        expect(resposta.status).toBe(403);
        expect((await corpo(resposta)).codigo).toBe("SO_CENTRAL_INTEGRACAO");
      });
    }
  }

  it("técnico bloqueado em consola/vagas/agente", async () => {
    entrarComo("tecnico");
    expect((await consolaGET(pedido("GET", "/api/integracao/consola?operador=azul"), contexto())).status).toBe(403);
    expect(
      (await vagasGET(pedido("GET", "/api/integracao/vagas?operador=azul&data=2032-05-04&zona=0303&tipo=instalacao"), contexto()))
        .status,
    ).toBe(403);
    expect(
      (await agentePOST(pedido("POST", "/api/integracao/agente", { operadorId: "azul", texto: "agenda uma instalação em Braga" }), contexto()))
        .status,
    ).toBe(403);
  });

  it("despachante azul lê consola e vagas do próprio operador; 403 noutro", async () => {
    entrarComo("azul");
    expect((await consolaGET(pedido("GET", "/api/integracao/consola?operador=azul"), contexto())).status).toBe(200);
    expect(
      (await vagasGET(pedido("GET", "/api/integracao/vagas?operador=azul&data=2032-05-04&zona=0303&tipo=instalacao"), contexto()))
        .status,
    ).toBe(200);
    expect(
      (await vagasGET(pedido("GET", "/api/integracao/vagas?operador=vermelho&data=2032-05-04&zona=0303&tipo=instalacao"), contexto()))
        .status,
    ).toBe(403);
    const logs = (await (await consolaGET(pedido("GET", "/api/integracao/consola"), contexto())).json()) as {
      logs: { operador_id?: string; pedido?: unknown; resposta?: unknown }[];
    };
    for (const linha of logs.logs) {
      if (linha.operador_id && linha.operador_id !== "azul" && linha.operador_id !== "*") {
        expect.fail(`despachante viu log de ${linha.operador_id}`);
      }
      if (linha.operador_id === "*") {
        expect(linha.pedido == null && linha.resposta == null).toBe(true);
      }
    }
  });

  it("central lê a consola; cenários hub-only não deixam rasto quando o despachante é recusado", async () => {
    for (const perfil of ["admin", "supervisor"] as const) {
      entrarComo(perfil);
      const resposta = await consolaGET(pedido("GET", "/api/integracao/consola?operador=azul"), contexto());
      expect(resposta.status).toBe(200);
    }
    entrarComo("azul");
    const antes = contar("integracao_logs");
    const resposta = await cenariosPOST(pedido("POST", "/api/integracao/cenarios", { id: "vaga_livre" }), contexto());
    expect(resposta.status).toBe(403);
    expect(contar("integracao_logs")).toBe(antes);
  });
});

describe("B1: webhook OFSC e endpoints simulados — só segredo PR#2", () => {
  const anteriorSegredo = process.env.OFSC_WEBHOOK_SECRET;

  beforeAll(() => {
    baseDados();
    process.env.OFSC_WEBHOOK_SECRET = SEGREDO;
  });
  afterAll(() => {
    if (anteriorSegredo === undefined) delete process.env.OFSC_WEBHOOK_SECRET;
    else process.env.OFSC_WEBHOOK_SECRET = anteriorSegredo;
  });
  beforeEach(() => {
    jar.clear();
  });

  it("webhook anónimo: 401 e a ordem não é criada", async () => {
    const evento = eventoValido();
    const ordens = contar("ordens");
    const atividades = contar("ofsc_atividades");
    const resposta = await eventosPOST(pedido("POST", "/api/integracao/ofsc/eventos", evento));
    expect(resposta.status).toBe(401);
    expect(contar("ordens")).toBe(ordens);
    expect(contar("ofsc_atividades")).toBe(atividades);
  });

  it("webhook anónimo com corpo inválido também dá 401 (auth antes da validação)", async () => {
    const resposta = await eventosPOST(pedido("POST", "/api/integracao/ofsc/eventos", { eventType: "outro" }));
    expect(resposta.status).toBe(401);
  });

  it("webhook com segredo errado: 401", async () => {
    const resposta = await eventosPOST(
      pedido("POST", "/api/integracao/ofsc/eventos", eventoValido(), { "x-vagacerta-ofsc-secret": "segredo-errado" }),
    );
    expect(resposta.status).toBe(401);
  });

  it("webhook com despachante autenticado mas sem segredo: 401 (não há auth por sessão)", async () => {
    entrarComo("azul");
    const ordens = contar("ordens");
    const resposta = await eventosPOST(pedido("POST", "/api/integracao/ofsc/eventos", eventoValido()));
    expect(resposta.status).toBe(401);
    expect(contar("ordens")).toBe(ordens);
  });

  it("webhook com o segredo (x-vagacerta-ofsc-secret): reserva confirmada", async () => {
    const ordens = contar("ordens");
    const resposta = await eventosPOST(
      pedido("POST", "/api/integracao/ofsc/eventos", eventoValido(), { "x-vagacerta-ofsc-secret": SEGREDO }),
    );
    expect(resposta.status).toBe(200);
    expect(((await resposta.json()) as { decisao: string }).decisao).toBe("Reserva Confirmada");
    expect(contar("ordens")).toBe(ordens + 1);
  });

  it("webhook com Bearer: aceite", async () => {
    const resposta = await eventosPOST(
      pedido("POST", "/api/integracao/ofsc/eventos", eventoValido(), { authorization: `Bearer ${SEGREDO}` }),
    );
    expect(resposta.status).toBe(200);
  });

  it("webhook com sessão da central sem segredo: 401", async () => {
    entrarComo("admin");
    const resposta = await eventosPOST(pedido("POST", "/api/integracao/ofsc/eventos", eventoValido()));
    expect(resposta.status).toBe(401);
  });

  it("webhook autenticado mas com corpo inválido: 400 DADOS_INVALIDOS", async () => {
    const resposta = await eventosPOST(
      pedido("POST", "/api/integracao/ofsc/eventos", { eventType: "outro", operator: "azul" }, { "x-vagacerta-ofsc-secret": SEGREDO }),
    );
    expect(resposta.status).toBe(400);
    expect((await corpo(resposta)).codigo).toBe("DADOS_INVALIDOS");
  });

  it("endpoints OFSC simulados anónimos: 401", async () => {
    const ausencias = contar("ofsc_ausencias");
    const criar = await ausenciaPOST(
      pedido("POST", "/api/ofsc/azul/resources/AZ_RES_MINHO/absences", {
        date: "2032-06-01",
        startTime: "10:00",
        endTime: "12:00",
        name: "Ausência anónima",
      }),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO" }),
    );
    expect(criar.status).toBe(401);
    const patch = await atividadePATCH(
      pedido("PATCH", "/api/ofsc/azul/activities/act-x", { resourceId: "AZ_RES_MINHO" }),
      contexto({ operador: "azul", activityId: "act-x" }),
    );
    expect(patch.status).toBe(401);
    const apagar = await ausenciaDELETE(
      pedido("DELETE", "/api/ofsc/azul/resources/AZ_RES_MINHO/absences/abs-x"),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO", id: "abs-x" }),
    );
    expect(apagar.status).toBe(401);
    const alterar = await ausenciaPATCH(
      pedido("PATCH", "/api/ofsc/azul/resources/AZ_RES_MINHO/absences/abs-x", { name: "x" }),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO", id: "abs-x" }),
    );
    expect(alterar.status).toBe(401);
    expect(contar("ofsc_ausencias")).toBe(ausencias);
  });

  it("endpoints OFSC simulados com despachante sem segredo: 401", async () => {
    entrarComo("verde");
    const resposta = await ausenciaPOST(
      pedido("POST", "/api/ofsc/azul/resources/AZ_RES_MINHO/absences", {
        date: "2032-06-02",
        startTime: "10:00",
        endTime: "12:00",
        name: "Ausência",
      }),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO" }),
    );
    expect(resposta.status).toBe(401);
  });

  it("endpoints OFSC simulados com segredo cumprem o contrato", async () => {
    const cabecalho = { "x-vagacerta-ofsc-secret": SEGREDO };
    const criada = await ausenciaPOST(
      pedido(
        "POST",
        "/api/ofsc/azul/resources/AZ_RES_MINHO/absences",
        { date: "2032-06-03", startTime: "10:00", endTime: "12:00", name: "Ausência de teste" },
        cabecalho,
      ),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO" }),
    );
    expect(criada.status).toBe(201);
    const { id } = (await criada.json()) as { id: string };

    const alterada = await ausenciaPATCH(
      pedido("PATCH", `/api/ofsc/azul/resources/AZ_RES_MINHO/absences/${id}`, { endTime: "13:00" }, cabecalho),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO", id }),
    );
    expect(alterada.status).toBe(200);

    const apagada = await ausenciaDELETE(
      pedido("DELETE", `/api/ofsc/azul/resources/AZ_RES_MINHO/absences/${id}`, undefined, cabecalho),
      contexto({ operador: "azul", resourceId: "AZ_RES_MINHO", id }),
    );
    expect(apagada.status).toBe(200);
  });
});
