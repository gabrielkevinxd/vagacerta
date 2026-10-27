import { describe, expect, it } from "vitest";
import { montarResumoDia, textoDe } from "@/lib/assistente/frases";
import { en, folhasDe, ptPT, sufixoPlural, t, tp } from "@/lib/i18n";
import { traduzirNarrativa } from "@/lib/i18n/motor";
import { cssFonteInter, tokensDeGlobals } from "@/server/pagina-negada";

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

  it("Intl.PluralRules: n=1 usa singular em pt-PT e en", () => {
    expect(sufixoPlural("pt-PT", 1)).toBe("um");
    expect(sufixoPlural("en", 1)).toBe("um");
    expect(sufixoPlural("pt-PT", 2)).toBe("outros");
    expect(tp(ptPT, "assistente.contagem.pendentes", 1)).toBe("1 pendente");
    expect(tp(ptPT, "assistente.contagem.pendentes", 2)).toBe("2 pendentes");
    expect(tp(en, "assistente.contagem.alertas", 1)).toBe("1 alert");
    expect(tp(en, "assistente.contagem.alertas", 2)).toBe("2 alerts");
    expect(tp(ptPT, "assistente.verAlertas", 1, { data: "27/10/2026" })).toBe("1 alerta no dia 27/10/2026.");
    expect(tp(en, "assistente.verAlertas", 1, { data: "27 Oct 2026" })).toBe("1 alert on 27 Oct 2026.");
    const resumo = montarResumoDia(ptPT, {
      data: "2026-10-27",
      agendadas: 1,
      espera: 1,
      pendentes: 1,
      curso: 1,
      margem: 15,
      alertas: 1,
    });
    expect(resumo).toContain("1 pendente");
    expect(resumo).not.toContain("1 pendentes");
    expect(resumo).toContain("1 alerta");
    expect(resumo).not.toContain("1 alertas");
    expect(resumo).toContain("27/10/2026");
    expect(resumo).not.toContain("2026-10-27");
    expect(
      textoDe(ptPT, {
        tipo: "esclarecer",
        chave: "assistente.ordemEstado",
        vars: { ref: "AZ-FILA-01", estado: "em_espera", equipa: "Equipa Minho" },
        pergunta: "onde está AZ-FILA-01",
      }),
    ).toContain("está em fila");
    expect(textoDe(ptPT, { tipo: "esclarecer", chave: "assistente.verAlertas", vars: { n: 1, data: "2026-10-27" }, pergunta: "alertas" })).toMatch(
      /^1 alerta no dia/,
    );
    expect(textoDe(ptPT, { tipo: "esclarecer", chave: "assistente.generico", vars: { n: 1 }, pergunta: "oi" })).toContain("Há 1 alerta");
  });

  it("pagina-negada lê tokens de globals.css", () => {
    const tokens = tokensDeGlobals();
    expect(tokens.background.toLowerCase()).toBe("#ffffff");
    expect(tokens.primary.toLowerCase()).toBe("#6e56cf");
    expect(tokens.foreground.toLowerCase()).toBe("#18181b");
    const fonte = cssFonteInter();
    expect(fonte.includes("@font-face") || fonte.includes("system-ui")).toBe(true);
  });
});
