import { describe, expect, it } from "vitest";
import { criarMundoDemonstracao } from "@/lib/demonstracao";
import { detetarConflitos } from "@/lib/rules/dia";
import { competenciasDeOperadores } from "@/lib/rules/operadores-servidos";
import { aplicarPlano, reencaixar } from "@/lib/rules/reencaixe";
import type { Equipa, Mundo, OperadorId } from "@/lib/rules/tipos";
import { proporVagas } from "@/lib/rules/vagas";

function mundo() {
  return criarMundoDemonstracao();
}

/** Fixture: só a Minho serve Verde em Braga — a Ave e a Cávado ficam sem Verde. */
function mundoSemVerdeNasVizinhas(): Mundo {
  const base = mundo();
  function semVerde(equipa: Equipa): Equipa {
    const ops = (equipa.operadoresServidos ?? []).filter((op) => op !== "verde") as OperadorId[];
    const seguintes = ops.length > 0 ? ops : (["azul"] as OperadorId[]);
    return {
      ...equipa,
      operadoresServidos: seguintes,
      competencias: competenciasDeOperadores(seguintes),
    };
  }
  return {
    ...base,
    equipas: base.equipas.map((equipa) =>
      equipa.id === "eq-ave" || equipa.id === "eq-cavado" ? semVerde(equipa) : equipa,
    ),
  };
}

describe("reencaixe da fila sobre a demonstração", () => {
  it("cancela a VR-90001 e encaixa a VD-URG (Ave também serve Verde)", () => {
    const base = mundo();
    const vermelho = base.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    const plano = reencaixar(base, { cancelarId: vermelho.id, permitirTroca: false });
    expect(plano.viavel).toBe(true);
    const aplicado = aplicarPlano(base, plano);
    expect(aplicado.ok).toBe(true);
    if (!aplicado.ok) return;
    const azul = aplicado.resultado.ordens.find((ordem) => ordem.referencia === "AZ-24081")!;
    const urgente = aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VD-URG")!;
    const cancelada = aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    expect(cancelada.estado).toBe("cancelada");
    expect(urgente.estado).toBe("agendada");
    expect(urgente.equipaId).toBe("eq-ave");
    expect(urgente.inicioPlaneado).toBe("08:00");
    expect(urgente.fimPlaneado).toBe("10:10");
    expect(azul.inicioPlaneado).toBe("10:00");
    expect(azul.fimPlaneado).toBe("13:00");
    expect(plano.mensagem).toBe(
      "A VR-90001 sai da Equipa Minho. A VD-URG entra às 08:00. A AZ-24081 passa a começar às 10:00.",
    );
    expect(base.ordens.find((ordem) => ordem.referencia === "VR-90001")?.estado).toBe("agendada");
  });

  it("não encaixa a ordem de outro operador quando o pedido está limitado ao vermelho", () => {
    const base = mundo();
    const vermelho = base.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    const plano = reencaixar(base, {
      cancelarId: vermelho.id,
      permitirTroca: true,
      apenasDoOperador: "vermelho",
    });
    expect(plano.viavel).toBe(true);
    expect(plano.movimentos.every((movimento) => movimento.referencia.startsWith("VR"))).toBe(true);
    const azul = plano.depois
      .find((linha) => linha.equipaId === "eq-minho")
      ?.blocos.find((bloco) => bloco.referencia === "AZ-24081");
    expect(azul?.inicio).toBe("10:00");
  });

  it("encaixa a VD-URG na Equipa Ave (serve Verde) sem precisar da Cávado", () => {
    const base = mundo();
    const urgente = base.ordens.find((ordem) => ordem.referencia === "VD-URG")!;
    const semTroca = reencaixar(base, { encaixarId: urgente.id, permitirTroca: false });
    expect(semTroca.viavel).toBe(true);
    const plano = reencaixar(base, { encaixarId: urgente.id, permitirTroca: true });
    expect(plano.viavel).toBe(true);
    expect(plano.movimentos.some((movimento) => movimento.paraEquipaId === "eq-cavado")).toBe(false);
    const aplicado = aplicarPlano(base, plano);
    expect(aplicado.ok).toBe(true);
    if (!aplicado.ok) return;
    expect(aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VD-URG")?.inicioPlaneado).toBe("08:00");
    expect(aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VD-URG")?.equipaId).toBe("eq-ave");
  });

  it("fixture: Ave/Cávado sem Verde — sem troca não cabe; com troca a VR vai para a Ave e a VD-URG entra na Minho", () => {
    const base = mundoSemVerdeNasVizinhas();
    const urgente = base.ordens.find((ordem) => ordem.referencia === "VD-URG")!;
    const semTroca = reencaixar(base, { encaixarId: urgente.id, permitirTroca: false });
    expect(semTroca.viavel).toBe(false);

    const plano = reencaixar(base, { encaixarId: urgente.id, permitirTroca: true });
    expect(plano.viavel).toBe(true);
    expect(plano.movimentos.some((m) => m.referencia === "VR-90001" && m.paraEquipaId === "eq-ave")).toBe(true);
    expect(plano.movimentos.some((m) => m.referencia === "VD-URG" && m.paraEquipaId === "eq-minho")).toBe(true);

    const aplicado = aplicarPlano(base, plano);
    expect(aplicado.ok).toBe(true);
    if (!aplicado.ok) return;
    const vd = aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VD-URG")!;
    const vr = aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    const az = aplicado.resultado.ordens.find((ordem) => ordem.referencia === "AZ-24081")!;
    expect(vd).toMatchObject({ estado: "agendada", equipaId: "eq-minho", inicioPlaneado: "08:00" });
    expect(vr.equipaId).toBe("eq-ave");
    expect(az.inicioPlaneado).toBe("10:25");
  });

  it("não deixa o despachante verde trocar uma ordem vermelha para libertar a fila", () => {
    const base = mundoSemVerdeNasVizinhas();
    const urgente = base.ordens.find((ordem) => ordem.referencia === "VD-URG")!;
    const plano = reencaixar(base, {
      encaixarId: urgente.id,
      permitirTroca: true,
      apenasDoOperador: "verde",
    });
    expect(plano.viavel).toBe(false);
    expect(plano.movimentos).toEqual([]);
    expect(plano.mensagem).toBe(
      "Encaixar VD-URG não cabe: nenhuma sequência respeita as janelas prometidas.",
    );
  });

  it("redistribui o dia quando a Equipa Minho falta e não publica um plano partido", () => {
    const base = mundo();
    const plano = reencaixar(base, { equipaEmFalta: "eq-minho", data: "2026-10-27" });
    expect(plano.viavel).toBe(true);
    const aplicado = aplicarPlano(base, plano);
    expect(aplicado.ok).toBe(true);
    if (!aplicado.ok) return;
    const minho = aplicado.resultado.equipas.find((equipa) => equipa.id === "eq-minho")!;
    expect(minho.indisponibilidades.some((linha) => linha.motivo === "Falta da equipa")).toBe(true);
    const aindaLa = aplicado.resultado.ordens.filter(
      (ordem) => ordem.equipaId === "eq-minho" && ordem.data === "2026-10-27" && ordem.estado === "agendada",
    );
    expect(aindaLa).toHaveLength(0);
    expect(aplicado.resultado.ordens.find((ordem) => ordem.referencia === "VD-URG")?.estado).toBe("em_espera");
    const partidas = aplicado.resultado.ordens.filter(
      (ordem) => ordem.data === "2026-10-27" && ordem.estado === "agendada" && ordem.inicioPlaneado === null,
    );
    expect(partidas).toHaveLength(0);
  });
});

describe("vagas e conflitos", () => {
  it("publica a janela azul das 10:00–12:00 como disponível numa equipa livre", () => {
    const base = mundo();
    const publicacao = proporVagas(base, {
      operadorId: "azul",
      data: "2026-10-28",
      area: "Guimarães",
      categoria: "instalacao",
      tecnologia: null,
    });
    const janela = publicacao.janelas.find((linha) => linha.inicio === "10:00" && linha.fim === "12:00");
    expect(janela?.estado).toBe("disponivel");
    expect(janela?.equipasLivres).toBeGreaterThan(0);
  });

  it("marca como opcional uma janela com 15 minutos ou menos de folga de início", () => {
    const base = mundo();
    const ave = base.equipas.find((equipa) => equipa.id === "eq-ave")!;
    ave.horarios = ave.horarios.map((horario) => ({ ...horario, fim: "20:40" }));
    const publicacao = proporVagas(base, {
      operadorId: "azul",
      data: "2026-10-27",
      area: "Guimarães",
      categoria: "instalacao",
      tecnologia: null,
    });
    const noite = publicacao.janelas.find((linha) => linha.inicio === "17:30");
    const naAve = noite?.equipas.find((linha) => linha.equipaId === "eq-ave");
    expect(naAve?.estado).toBe("opcional");
    expect(naAve?.folgaMin).toBeLessThanOrEqual(15);
  });

  it("assinala margem de deslocação e início fora da janela", () => {
    const base = mundo();
    const azul = base.ordens.find((ordem) => ordem.referencia === "AZ-24081")!;
    const vermelho = base.ordens.find((ordem) => ordem.referencia === "VR-90001")!;
    vermelho.inicioPlaneado = "09:00";
    vermelho.fimPlaneado = "11:35";
    azul.inicioPlaneado = "11:40";
    azul.fimPlaneado = "14:40";
    const conflitos = detetarConflitos(base, "eq-minho", "2026-10-27");
    expect(conflitos.some((conflito) => conflito.tipo === "deslocacao")).toBe(true);
    azul.inicioPlaneado = "09:30";
    azul.fimPlaneado = "12:30";
    expect(detetarConflitos(base, "eq-minho", "2026-10-27").some((conflito) => conflito.tipo === "janela")).toBe(true);
  });
});
