import { describe, expect, it } from "vitest";
import { criarMundoDemonstracao } from "@/lib/demonstracao";
import { projetarAgenda, projetarPlano } from "@/lib/rules/agenda";
import { podeLerOrdem, podeMarcarOperador, type Ator } from "@/lib/rules/permissoes";
import { reencaixar } from "@/lib/rules/reencaixe";

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

describe("isolamento por operador", () => {
  it("o despachante azul lê as suas ordens e não as do vermelho", () => {
    const base = criarMundoDemonstracao();
    const azul = base.ordens.find((ordem) => ordem.referencia === "AZ-24081")!;
    const vermelho = base.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    expect(podeLerOrdem(despachanteAzul, azul)).toBe(true);
    expect(podeLerOrdem(despachanteAzul, vermelho)).toBe(false);
    expect(podeMarcarOperador(despachanteAzul, "azul")).toBe(true);
    expect(podeMarcarOperador(despachanteAzul, "verde")).toBe(false);
    expect(podeMarcarOperador(tecnico, "azul")).toBe(false);
  });

  it("a agenda do despachante mostra capacidade ocupada sem dados de outro operador", () => {
    const base = criarMundoDemonstracao();
    const agenda = projetarAgenda(base, despachanteAzul, "2026-10-27", "2026-10-27");
    const blocos = agenda.dias.flatMap((dia) => dia.equipas.flatMap((equipa) => equipa.blocos));
    const ocupados = blocos.filter((bloco) => bloco.vista === "ocupada");
    const proprios = blocos.filter((bloco) => bloco.vista === "completa");
    expect(ocupados.length).toBeGreaterThan(0);
    expect(proprios.some((bloco) => bloco.referencia === "AZ-24081")).toBe(true);
    const serializado = JSON.stringify(ocupados);
    expect(serializado).not.toContain("VR-90001");
    expect(serializado).not.toContain("Duarte");
    expect(serializado).not.toContain("vermelho");
    expect(serializado).not.toContain("clienteNome");
  });

  it("o técnico só vê a própria equipa, com a morada das visitas que vai executar", () => {
    const base = criarMundoDemonstracao();
    const agenda = projetarAgenda(base, tecnico, "2026-10-27", "2026-10-27");
    expect(agenda.dias[0].equipas.map((equipa) => equipa.equipaId)).toEqual(["eq-minho"]);
    const referencias = agenda.dias[0].equipas[0].blocos.map((bloco) => bloco.referencia);
    expect(referencias).toContain("AZ-24081");
    expect(referencias).toContain("VR-90001");
    expect(agenda.dias[0].equipas[0].blocos.every((bloco) => bloco.morada)).toBe(true);
  });

  it("o plano mostrado ao despachante azul não revela a referência verde", () => {
    const base = criarMundoDemonstracao();
    const vermelho = base.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    const plano = reencaixar(base, { cancelarId: vermelho.id });
    const vista = projetarPlano(base, plano.mundo, plano, despachanteAzul, "selo");
    const texto = JSON.stringify(vista);
    expect(texto).not.toContain("VD-URG");
    expect(texto).not.toContain("Matilde");
    expect(vista.selo).toBe("selo");
  });
});
