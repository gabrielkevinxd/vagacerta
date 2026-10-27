import { describe, expect, it } from "vitest";
import { interpretarPedido } from "@/lib/ofsc/interpretador";

describe("interpretador OFSC", () => {
  it("extrai instalação em Braga na terça às 10h e a referência, sem inventar o técnico", () => {
    const { extraidos, emFalta } = interpretarPedido(
      "agenda uma instalação em Braga terça às 10h para o cliente X, ref AZ-1001",
      "azul",
      "2026-10-26",
    );
    expect(extraidos.city).toBe("Braga");
    expect(extraidos.zona).toBe("0303");
    expect(extraidos.tipoIntervencao).toBe("instalacao");
    expect(extraidos.data).toBe("2026-10-27");
    expect(extraidos.janelaInicio).toBe("10:00");
    expect(extraidos.customerName).toContain("X");
    expect(extraidos.apptNumber).toBe("AZ-1001");
    expect(emFalta).toContain("resourceId");
    expect(extraidos.resourceId).toBeUndefined();
  });

  it("não inventa data nem janela quando o texto não as traz", () => {
    const { extraidos, emFalta } = interpretarPedido("manutenção em Guimarães", "azul");
    expect(extraidos.tipoIntervencao).toBe("manutencao");
    expect(extraidos.data).toBeUndefined();
    expect(extraidos.janelaInicio).toBeUndefined();
    expect(emFalta).toEqual(expect.arrayContaining(["data", "janelaInicio", "janelaFim", "resourceId", "apptNumber"]));
  });
});
