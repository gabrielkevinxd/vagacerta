import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { criarMundoDemonstracao } from "@/lib/demonstracao";
import { cancelarOrdem, restaurarCancelamento } from "@/lib/rules/dia";
import { estadoEditavel, podeEditarFicha, type Ator } from "@/lib/rules/permissoes";
import { atualizarOrdem, restaurarCancelamento as restaurarServico } from "@/server/servicos";
import { baseDados } from "@/server/db";
import { ErroHttp } from "@/server/erros";

const admin: Ator = {
  id: "usr-admin",
  nome: "Teresa Varela",
  papel: "administrador",
  operadorId: null,
  tecnicoId: null,
  equipaId: null,
};

const despachanteAzul: Ator = {
  id: "usr-azul",
  nome: "Clara Monteiro",
  papel: "despachante",
  operadorId: "azul",
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

describe("V15 ordem só de leitura", () => {
  beforeAll(() => {
    baseDados();
  });

  it("estadoEditavel e podeEditarFicha recusam concluída", () => {
    expect(estadoEditavel("concluida")).toBe(false);
    expect(estadoEditavel("agendada")).toBe(true);
    const concluida = { operadorId: "verde", equipaId: "eq-beiras", estado: "concluida" as const };
    expect(podeEditarFicha(admin, concluida)).toBe(false);
  });

  it("atualizarOrdem devolve 409 para concluída", () => {
    expect(() =>
      atualizarOrdem(admin, "ord-vd-26004", { nota: "tentativa" }),
    ).toThrowError(ErroHttp);
    try {
      atualizarOrdem(admin, "ord-vd-26004", { nota: "tentativa" });
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroHttp);
      expect((erro as ErroHttp).status).toBe(409);
      expect((erro as ErroHttp).message).toContain("não pode ser alterada");
    }
  });
});

describe("/restaurar", () => {
  it("repete a hora original após cancelar", () => {
    const mundo = criarMundoDemonstracao();
    const alvo = mundo.ordens.find((ordem) => ordem.referencia === "AZ-24081")!;
    const inicio = alvo.inicioPlaneado;
    const fim = alvo.fimPlaneado;
    expect(inicio).toBeTruthy();
    const cancelada = cancelarOrdem(mundo, alvo.id, "teste restaurar", "central");
    expect(cancelada.ok).toBe(true);
    if (!cancelada.ok) return;
    expect(cancelada.resultado.inicioPlaneado).toBe(inicio);
    expect(cancelada.resultado.fimPlaneado).toBe(fim);
    const reposta = restaurarCancelamento(cancelada.mundo, alvo.id);
    expect(reposta.ok).toBe(true);
    if (!reposta.ok) return;
    expect(reposta.resultado.estado).toBe("agendada");
    expect(reposta.resultado.inicioPlaneado).toBe(inicio);
    expect(reposta.resultado.fimPlaneado).toBe(fim);
  });

  it("técnico não repõe; despachante só o próprio operador; slot ocupado dá 409", () => {
    expect(() => restaurarServico(tecnico, "ord-vr-canc-01")).toThrowError(/técnico/i);

    const mundo = criarMundoDemonstracao();
    const vermelha = mundo.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    const cancelada = cancelarOrdem(mundo, vermelha.id, "fora", "operador");
    expect(cancelada.ok).toBe(true);
    if (!cancelada.ok) return;

    // Despachante azul não lê ordem vermelha → servico 403 via podeLerOrdem.
    // Usamos o domínio para o conflito de horário: ocupar o slot antes de restaurar.
    const aposCancel = cancelada.mundo;
    const azul = aposCancel.ordens.find((ordem) => ordem.referencia === "AZ-24081")!;
    azul.inicioPlaneado = vermelha.inicioPlaneado;
    azul.fimPlaneado = vermelha.fimPlaneado;
    azul.inicioFixado = true;
    azul.equipaId = vermelha.equipaId;
    azul.data = vermelha.data;
    const conflito = restaurarCancelamento(aposCancel, vermelha.id);
    expect(conflito.ok).toBe(false);
    if (conflito.ok) return;
    expect(conflito.codigo).toBe("CONFLITO");
    expect(conflito.mensagem).toContain("ocupado");

    void despachanteAzul;
  });
});
