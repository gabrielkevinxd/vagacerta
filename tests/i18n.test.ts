import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { montarResumoDia, textoDe } from "@/lib/assistente/frases";
import { DESIGN_TOKENS } from "@/lib/design-tokens";
import { en, folhasDe, ptPT, sufixoPlural, t, tp } from "@/lib/i18n";
import { traduzirNarrativa } from "@/lib/i18n/motor";
import { _resetCacheFonteInter, cssFonteInter, tokensDeGlobals } from "@/server/pagina-negada";

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

  it("DESIGN_TOKENS bate com :root de globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const raiz = css.match(/:root\s*\{([\s\S]*?)\n\}/);
    expect(raiz).toBeTruthy();
    const bloco = raiz![1];
    for (const [chave, valor] of Object.entries(DESIGN_TOKENS)) {
      const m = bloco.match(new RegExp(`--${chave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*([^;]+);`));
      expect(m, `--${chave} em :root`).toBeTruthy();
      expect(m![1].trim().toLowerCase()).toBe(valor.toLowerCase());
    }
    const tokens = tokensDeGlobals();
    expect(tokens).toEqual({ ...DESIGN_TOKENS });
  });

  it("cssFonteInter extrai Inter de CSS com hash (sem build)", () => {
    const raiz = mkdtempSync(join(tmpdir(), "vc-inter-"));
    const chunks = join(raiz, ".next/static/chunks");
    mkdirSync(chunks, { recursive: true });
    // Nome com hash — como o next/font gera; conteúdo é o que importa.
    writeFileSync(
      join(chunks, "3dbqw1culsg01.css"),
      [
        "@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(../media/51d71ccf7e7a6b96-s.woff2)format(\"woff2\")}",
        "@font-face{font-family:Inter Fallback;src:local(\"Arial\")}",
        "@font-face { font-family: Inter; font-style: italic; src:url(\"../../media/outro.woff2\") format(\"woff2\") }",
        ".x{color:red}",
      ].join(""),
      "utf8",
    );
    _resetCacheFonteInter();
    const fonte = cssFonteInter(raiz);
    expect(fonte).toContain("@font-face");
    expect(fonte).toMatch(/font-family:\s*Inter\b/);
    expect(fonte).toContain('/_next/static/media/51d71ccf7e7a6b96-s.woff2');
    expect(fonte).toContain('/_next/static/media/outro.woff2');
    expect(fonte).not.toContain("Inter Fallback");
    // Sem duplicados: 2 faces Inter (normal + italic), não 4.
    expect((fonte.match(/@font-face/g) ?? []).length).toBe(2);
  });

  it.skipIf(!existsSync(join(process.cwd(), ".next/static")))(
    "pagina-negada carrega Inter real do build (@font-face)",
    () => {
      _resetCacheFonteInter();
      const fonte = cssFonteInter();
      expect(fonte).toContain("@font-face");
      expect(fonte).toMatch(/font-family:\s*Inter\b/);
      expect(fonte).toContain("/_next/");
      expect(fonte.includes("/* Inter") && !fonte.includes("@font-face")).toBe(false);
    },
  );
});
