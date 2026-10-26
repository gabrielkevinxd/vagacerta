import { describe, expect, it } from "vitest";
import { en, folhasDe, ptPT, t } from "@/lib/i18n";
import { traduzirNarrativa } from "@/lib/i18n/motor";

describe("catálogos i18n", () => {
  it("pt-PT e en têm as mesmas chaves", () => {
    expect(folhasDe(en).sort()).toEqual(folhasDe(ptPT).sort());
  });

  it("interpola variáveis nas duas línguas", () => {
    expect(t(ptPT, "painel.titulo", { data: "terça-feira" })).toContain("terça-feira");
    expect(t(en, "painel.titulo", { data: "Tuesday" })).toContain("Tuesday");
  });

  it("traduz a narrativa do motor em inglês", () => {
    expect(traduzirNarrativa(en, "A AZ-1 sai de Equipa Minho.")).toBe("AZ-1 leaves Equipa Minho.");
    expect(
      traduzirNarrativa(
        en,
        "VD-URG passaria a 08:00–11:00 na Equipa Minho. O dia é recalculado com a janela prometida, a margem de deslocação, as indisponibilidades e as competências. Nada fica gravado até confirmar.",
      ),
    ).toContain("would move to");
  });
});
