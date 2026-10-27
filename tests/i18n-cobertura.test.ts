import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { mensagensDe } from "@/lib/i18n";
import {
  apresentarResultado,
  traduzirDetalheAgente,
  traduzirHistoria,
  traduzirLogOfsc,
  traduzirMensagem,
  traduzirNarrativa,
} from "@/lib/i18n/motor";

/**
 * Cobertura de tradução: tudo o que o motor, os serviços, a consola OFSC e o agente escrevem em português e que chega
 * à interface tem de aparecer em inglês quando o idioma é inglês — sem sobrar português — e ficar igual em português.
 *
 * Três redes: (1) uma varredura do código-fonte, que apanha qualquer frase nova escrita nos pontos em que o servidor
 * fala com o utilizador; (2) a execução dos 11 cenários da consola, que gera todas as linhas de história; (3) as
 * operações da ficha de ordem, que geram o histórico.
 */

const RAIZ = path.resolve(__dirname, "..", "src");
const pt = mensagensDe("pt-PT");
const en = mensagensDe("en");

// ── Deteção de português numa frase que devia estar em inglês

// Fronteiras de palavra com Unicode: em «Nádia» ou «Lourenço» a letra acentuada não conta como fronteira.
const MARCAS_PT = new RegExp(
  "(?<![\\p{L}])(" +
    [
      "não", "uma", "para", "com", "sem", "fila", "equipa", "ordem", "visita", "janela", "janelas", "reserva", "falta", "plano", "erro",
      "ficou", "fica", "tem", "deve", "já", "só", "vaga", "vagas", "libertada", "ignorado", "duplicado", "evento", "atividade",
      "ausência", "ausências", "operador", "operadores", "alternativa", "confirmada", "recusada", "esgotada", "fechada",
      "indisponível", "técnico", "técnicos", "cancelada", "motivo", "dados", "atualizados", "criada", "agendada", "pendente",
      "concluída", "encaixar", "cabe", "sequência", "prometidas", "respeita", "instalações", "manutenções", "adicionais",
      "reconciliação", "dia", "hora", "às", "ao", "dos", "das", "nos", "nas", "nenhuma", "nenhum", "esta", "este", "essa", "esse",
      "ainda", "porque", "enquanto", "deixa", "volta", "passa", "sai", "entra", "muda", "libertar", "pedidas", "pedido", "baixo",
      "quando", "também", "são", "foi", "estado", "plano", "cliente", "morada",
    ].join("|") +
    ")(?![\\p{L}])",
  "iu",
);

/** Os nomes das equipas («Equipa Minho») e os identificadores técnicos são dados, não frases do servidor. */
function semDados(texto: string): string {
  return texto
    .replace(/Equipa\s+[A-ZÁÉÍÓÚ][\wáéíóúãõç]+/g, " ")
    .replace(/\b[A-Z]{2}_RES_[A-Z]+\b/g, " ")
    .replace(/\bact-[\w-]+/g, " ");
}

function temPortugues(texto: string): boolean {
  return MARCAS_PT.test(semDados(texto));
}

function todasAsTraducoes(texto: string, codigo?: string): string[] {
  return [
    traduzirMensagem(en, texto, codigo),
    traduzirNarrativa(en, texto),
    traduzirHistoria(en, texto),
    traduzirLogOfsc(en, texto),
    traduzirDetalheAgente(en, texto),
  ];
}

/** A tradução em inglês: a primeira que muda o texto. `null` se nenhuma o muda. */
function emIngles(texto: string, codigo?: string): string | null {
  const candidatas = [
    ...todasAsTraducoes(texto, codigo),
    // fichas de decisão da consola: «Reserva Recusada», «Capacidade Esgotada»…
    apresentarResultado(en, { decisao: texto }),
    apresentarResultado(en, { motivo: texto }),
  ];
  return candidatas.find((candidata) => candidata !== texto) ?? null;
}

/** Falta traduzir? Só se o texto estiver em português; o que já está em inglês (ou é só um identificador) passa. */
function faltaTraduzir(texto: string, codigo?: string): string | null {
  if (!temPortugues(texto)) return null;
  const ingles = emIngles(texto, codigo);
  return ingles === null || temPortugues(ingles) ? (ingles ?? "(sem tradução)") : null;
}

// ── Varredura do código-fonte: pontos em que o servidor fala com o utilizador

function ficheiros(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = path.join(pasta, nome);
    if (statSync(caminho).isDirectory()) return ficheiros(caminho);
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : [];
  });
}

/** Percorre o código sem cair em strings, templates nem comentários e devolve as chamadas a `nome(...)` com os argumentos em texto. */
function chamadas(codigo: string, nome: string): string[][] {
  const resultado: string[][] = [];
  const n = codigo.length;
  const procura = new RegExp(`(?<![\\w.$])${nome}\\s*\\(`, "g");
  for (let achado = procura.exec(codigo); achado; achado = procura.exec(codigo)) {
    if (/function\s+$/.test(codigo.slice(Math.max(0, achado.index - 12), achado.index))) continue;
    let i = achado.index + achado[0].length;
    let profundidade = 1;
    let atual = "";
    const args: string[] = [];
    while (i < n && profundidade > 0) {
      const c = codigo[i]!;
      if (c === '"' || c === "'" || c === "`") {
        let j = i + 1;
        let texto = c;
        while (j < n) {
          const ch = codigo[j]!;
          texto += ch;
          if (ch === "\\") {
            texto += codigo[j + 1] ?? "";
            j += 2;
            continue;
          }
          if (c === "`" && ch === "$" && codigo[j + 1] === "{") {
            let prof = 1;
            texto += "{";
            j += 2;
            while (j < n && prof > 0) {
              const cj = codigo[j]!;
              if (cj === "{") prof += 1;
              else if (cj === "}") prof -= 1;
              texto += cj;
              j += 1;
            }
            continue;
          }
          if (ch === c) break;
          j += 1;
        }
        atual += texto;
        i = j + 1;
        continue;
      }
      if (c === "/" && codigo[i + 1] === "/") {
        while (i < n && codigo[i] !== "\n") i += 1;
        continue;
      }
      if (c === "/" && codigo[i + 1] === "*") {
        i += 2;
        while (i < n && !(codigo[i] === "*" && codigo[i + 1] === "/")) i += 1;
        i += 2;
        continue;
      }
      if (c === "(" || c === "[" || c === "{") profundidade += 1;
      if (c === ")" || c === "]" || c === "}") {
        profundidade -= 1;
        if (profundidade === 0) break;
      }
      if (c === "," && profundidade === 1) {
        args.push(atual.trim());
        atual = "";
        i += 1;
        continue;
      }
      atual += c;
      i += 1;
    }
    args.push(atual.trim());
    resultado.push(args);
  }
  return resultado;
}

/** Valores plausíveis para o que um template põe dentro de `${…}`, para a frase ficar com a forma real. */
const AMOSTRAS: [RegExp, string][] = [
  [/NOME_OPERADOR/, "Operador Azul"],
  [/rotulo\(/, "Azul"],
  [/eventType/, "activityCreated"],
  [/apptNumber|appt/, "AZ-24081"],
  [/bucket/i, "DST_TELECOM"],
  [/activityId|\bid\b/, "act-1"],
  [/contador/, "Técnico 1, 2026-10-27, instalações = 2 vagas (3 → 2)"],
  [/vagasDe|\bde\b/, "3"],
  [/vagasPara|\bpara\b/, "2"],
  [/sugestao/, " Alternativa: Técnico 1, Braga, 10:00–12:00, 2 vagas."],
  [/^motivo$/, "Capacidade Esgotada"],
  [/decisao/, "Reserva Confirmada"],
  [/resourceId/, "AZ_RES_MINHO"],
  [/metodo/, "POST"],
  [/caminho/, "/resources/AZ_RES_MINHO/absences"],
  [/^tecnico$/, "Técnico"],
  [/equipaId/, "eq-minho"],
  [/historia/, "Reserva Recusada: Capacidade Esgotada."],
  [/referencia|\.ref\b|^ref$/, "AZ-24081"],
  [/equipa|\.nome/, "Equipa Minho"],
  [/inicio|hora|\.fim/, "10:00"],
  [/data|date/, "2026-10-27"],
  [/margem|limite/, "15"],
  [/mensagem/, "Erro"],
];

function amostraDe(expressao: string): string {
  return AMOSTRAS.find(([re]) => re.test(expressao.trim()))?.[1] ?? "X1";
}

/** Os literais de texto (aspas ou template) que há dentro de um argumento, com `${…}` substituído por uma amostra. */
function literaisDe(argumento: string): string[] {
  const achados: string[] = [];
  const re = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.|\$\{(?:[^{}]|\{[^{}]*\})*\})*)`/g;
  for (let m = re.exec(argumento); m; m = re.exec(argumento)) {
    const bruto = m[1] ?? m[2] ?? m[3] ?? "";
    const texto = bruto.replace(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g, (_, expressao: string) => amostraDe(expressao)).replace(/\\(.)/g, "$1");
    if (/\s/.test(texto.trim()) && !/^[\w./:\-]+$/.test(texto)) achados.push(texto);
  }
  return achados;
}

interface Mensagem {
  onde: string;
  codigo?: string;
  texto: string;
}

const FICHEIROS_ANALISADOS = [
  ...ficheiros(path.join(RAIZ, "lib", "rules")),
  ...ficheiros(path.join(RAIZ, "server")),
  ...ficheiros(path.join(RAIZ, "app", "api")),
  ...ficheiros(path.join(RAIZ, "app", "(painel)")).filter((f) => /accoes\.ts$/.test(f)),
  path.join(RAIZ, "lib", "gemeo", "pedido.ts"),
  path.join(RAIZ, "lib", "ofsc", "xai.ts"),
].filter((f) => !/tipos\.ts$/.test(f));

function mensagensDoCodigo(): Mensagem[] {
  const achadas: Mensagem[] = [];
  for (const ficheiro of FICHEIROS_ANALISADOS) {
    const codigo = readFileSync(ficheiro, "utf8");
    const rel = path.relative(RAIZ, ficheiro).replace(/\\/g, "/");
    const juntar = (args: string[], posCodigo: number, posTexto: number) => {
      const cod = literaisDe(args[posCodigo] ?? "")[0] ?? (/^"([A-Z_]+)"$/.exec((args[posCodigo] ?? "").trim())?.[1] ?? undefined);
      for (const texto of literaisDe(args[posTexto] ?? "")) achadas.push({ onde: rel, codigo: cod, texto });
    };
    for (const args of chamadas(codigo, "falha")) {
      const cod = /^"([A-Z_]+)"$/.exec((args[0] ?? "").trim())?.[1];
      for (const texto of literaisDe(args[1] ?? "")) achadas.push({ onde: `${rel} falha()`, codigo: cod, texto });
    }
    for (const args of chamadas(codigo, "ErroHttp")) {
      const cod = /^"([A-Z_]+)"$/.exec((args[1] ?? "").trim())?.[1];
      for (const texto of literaisDe(args[2] ?? "")) achadas.push({ onde: `${rel} ErroHttp`, codigo: cod, texto });
    }
    for (const args of chamadas(codigo, "exigir")) {
      const cod = /^"([A-Z_]+)"$/.exec((args[2] ?? "").trim())?.[1];
      for (const texto of literaisDe(args[3] ?? "")) achadas.push({ onde: `${rel} exigir()`, codigo: cod, texto });
    }
    for (const args of chamadas(codigo, "registarLog")) {
      for (const texto of literaisDe(args[1] ?? "")) achadas.push({ onde: `${rel} registarLog()`, texto });
    }
    for (const args of chamadas(codigo, "chamarOfsc")) {
      for (const texto of literaisDe(args[5] ?? "")) achadas.push({ onde: `${rel} chamarOfsc()`, texto });
    }
    for (const args of chamadas(codigo, "fechar")) {
      for (const texto of literaisDe(args[5] ?? "")) achadas.push({ onde: `${rel} fechar()`, texto });
    }
    // `mensagem: "…"` e `motivo: "…"` em objetos (conflitos, movimentos, recusas)
    for (const m of codigo.matchAll(/\b(?:mensagem|motivo|detalhe)\s*:\s*((?:"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.|\$\{(?:[^{}]|\{[^{}]*\})*\})*`))/g)) {
      for (const texto of literaisDe(m[1] ?? "")) achadas.push({ onde: `${rel} propriedade`, texto });
    }
    // detalhe do agente: `detalhe: "…"` já apanhado acima
    void juntar;
  }
  // Sem repetidos
  const vistos = new Set<string>();
  return achadas.filter((m) => {
    const chave = `${m.codigo ?? ""}|${m.texto}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/** Frases que o servidor escreve mas que NÃO chegam à interface (registos internos, dados técnicos, mensagens só de teste). */
const NAO_CHEGAM_A_INTERFACE: [RegExp, string][] = [
  [/^Base de demonstração criada\.$/, "linha de auditoria, nunca mostrada"],
  [/^Operador OFSC desconhecido\.$/, "inalcançável: a rota valida o operador antes de chamar o recetor"],
  [/^Reserva incompleta\.$/, "inalcançável: o zod valida o operador e o tipo antes"],
  [/^Estado: /, "modelo do histórico da ficha: verificado com histórico real, mais abaixo"],
  [/^Plano: /, "modelo do histórico da ficha: verificado com histórico real, mais abaixo"],
  [/ criada \(/, "modelo do histórico da ficha: verificado com histórico real, mais abaixo"],
  [/^(PATCH|POST|DELETE) \//, "linha de protocolo HTTP: verificada com as linhas reais da consola, mais abaixo"],
];

function chegamAInterface(lista: Mensagem[]): Mensagem[] {
  return lista.filter((m) => !NAO_CHEGAM_A_INTERFACE.some(([padrao]) => padrao.test(m.texto)));
}

describe("cobertura de tradução: os momentos da demonstração em inglês", () => {
  it("«não cabe», competência da equipa de destino e janela pedida (os três erros do motor)", () => {
    const naoCabe = "Encaixar VD-URG não cabe: nenhuma sequência respeita as janelas prometidas.";
    expect(traduzirNarrativa(en, naoCabe)).toBe("Fitting VD-URG in does not work: no sequence respects the promised windows.");
    expect(traduzirMensagem(en, naoCabe, "INVIAVEL")).toBe("Fitting VD-URG in does not work: no sequence respects the promised windows.");
    expect(traduzirMensagem(en, "A equipa de destino não cobre esta ordem.", "COMPETENCIA")).toBe("The destination team does not cover this order.");
    expect(traduzirMensagem(en, "O início pedido está fora da janela prometida.", "JANELA")).toBe("The requested start is outside the promised window.");
    // em português o texto não muda
    expect(traduzirNarrativa(pt, naoCabe)).toBe(naoCabe);
    expect(traduzirMensagem(pt, "A equipa de destino não cobre esta ordem.", "COMPETENCIA")).toBe("A equipa de destino não cobre esta ordem.");
    expect(traduzirMensagem(pt, "O início pedido está fora da janela prometida.", "JANELA")).toBe("O início pedido está fora da janela prometida.");
  });

  it("as frases com várias orações (a falta que deixa um dia sem sequência) traduzem-se por inteiro", () => {
    const falta = "A falta deixa um dia sem sequência. O plano não se publica.";
    expect(traduzirNarrativa(en, falta)).toBe("The absence leaves a day with no valid sequence. The plan is not published.");
    expect(traduzirMensagem(en, falta, "INVIAVEL")).toBe("The absence leaves a day with no valid sequence. The plan is not published.");
    expect(traduzirNarrativa(pt, falta)).toBe(falta);
  });

  it("o plano da história-estrela (três frases seguidas) traduz-se frase a frase, sem misturar línguas", () => {
    const plano = "A VR-90001 passa para Equipa Ave. A VD-URG entra às 08:00. A AZ-24081 passa a começar às 10:25.";
    expect(traduzirNarrativa(en, plano)).toBe("VR-90001 moves to Equipa Ave. VD-URG starts at 08:00. AZ-24081 now starts at 10:25.");
    expect(traduzirNarrativa(pt, plano)).toBe("VR-90001 passa para Equipa Ave. VD-URG entra às 08:00. AZ-24081 passa a começar às 10:25.");
    const cancelar = "A AZ-24081 sai de Equipa Minho. A VD-URG entra às 08:00. A VR-90001 passa a começar às 09:00.";
    expect(temPortugues(traduzirNarrativa(en, cancelar))).toBe(false);
  });

  it("«a equipa» sem nome nas frases do reencaixe", () => {
    expect(traduzirNarrativa(en, "A VD-URG sai de a equipa.")).toBe("VD-URG leaves the team.");
  });
});

describe("cobertura de tradução: varredura do código", () => {
  const mensagens = mensagensDoCodigo();

  it("encontra as frases do motor e do servidor (a varredura funciona)", () => {
    expect(mensagens.length).toBeGreaterThan(80);
    const textos = mensagens.map((m) => m.texto);
    expect(textos).toContain("A equipa de destino não cobre esta ordem."); // dia.ts, código COMPETENCIA
    expect(textos).toContain("O início pedido está fora da janela prometida."); // dia.ts, código JANELA
    expect(textos).toContain("Encaixar X1 não cabe: nenhuma sequência respeita as janelas prometidas.".replace("X1", "AZ-24081")); // reencaixe.ts
  });

  it("todas as frases que chegam à interface têm tradução para inglês, sem sobrar português", () => {
    const semTraducao = chegamAInterface(mensagens)
      .map((m) => ({ m, em: faltaTraduzir(m.texto, m.codigo) }))
      .filter(({ em }) => em !== null)
      .map(({ m, em }) => `${m.onde}${m.codigo ? ` [${m.codigo}]` : ""}: «${m.texto}» → ${em}`);
    expect(semTraducao, `Frases sem tradução para inglês:\n${semTraducao.join("\n")}`).toEqual([]);
  });

  it("em português as frases ficam exatamente como o servidor as escreveu (exceto as do catálogo que o encurtam de propósito)", () => {
    const ENCURTADAS = new Set(["Corrigir um período que já começou exige confirmação. O passado não se reescreve sozinho."]);
    const alteradas = chegamAInterface(mensagens)
      .filter((m) => !ENCURTADAS.has(m.texto))
      .map((m) => ({ m, em: traduzirMensagem(pt, m.texto, m.codigo) }))
      .filter(({ m, em }) => em !== m.texto && !m.texto.includes("X1"))
      .map(({ m, em }) => `${m.onde}: «${m.texto}» → «${em}»`);
    expect(alteradas, `Frases que mudam em PT:\n${alteradas.join("\n")}`).toEqual([]);
  });

  it("cada código de erro conhecido tem texto em PT e em EN", () => {
    const codigos = [...new Set(mensagens.map((m) => m.codigo).filter((c): c is string => Boolean(c)))];
    expect(codigos.length).toBeGreaterThan(15);
    for (const codigo of codigos) {
      const doCodigo = mensagens.filter((m) => m.codigo === codigo);
      for (const m of chegamAInterface(doCodigo)) {
        expect(faltaTraduzir(m.texto, codigo), `${codigo}: «${m.texto}»`).toBeNull();
        expect(traduzirMensagem(pt, m.texto, codigo).length).toBeGreaterThan(0);
      }
    }
  });
});

// ── As linhas de história da consola e o histórico das ordens, geradas de verdade

describe("cobertura de tradução: consola de integração, agente e histórico", () => {
  const pasta = mkdtempSync(path.join(tmpdir(), "vagacerta-i18n-"));
  const guardado = {
    base: (globalThis as { __vcDb?: unknown }).__vcDb,
    pasta: process.env.VC_DATA_DIR,
  };

  afterAll(() => {
    const global = globalThis as { __vcDb?: { close(): void } | undefined };
    try {
      global.__vcDb?.close();
    } catch {
      /* já fechada */
    }
    global.__vcDb = guardado.base as typeof global.__vcDb;
    if (guardado.pasta === undefined) delete process.env.VC_DATA_DIR;
    else process.env.VC_DATA_DIR = guardado.pasta;
    vi.resetModules();
    try {
      rmSync(pasta, { recursive: true, force: true });
    } catch {
      /* o sistema limpa a pasta temporária mais tarde */
    }
  });

  it("as linhas de história dos 11 cenários saem em inglês, e em português ficam como foram escritas", async () => {
    (globalThis as { __vcDb?: unknown }).__vcDb = undefined;
    process.env.VC_DATA_DIR = pasta;
    vi.resetModules();
    const { baseDados } = await import("@/server/db");
    const { correrCenario } = await import("@/server/ofsc/cenarios");
    const { listarLogs } = await import("@/server/ofsc/loja");
    baseDados();
    const ids = [
      "vaga_livre",
      "capacidade_esgotada",
      "zona_fechada",
      "fora_da_janela",
      "tecnico_indisponivel",
      "reagendamento",
      "cancelamento_reencaixe",
      "falta_equipa",
      "dois_operadores",
      "evento_duplicado",
      "ofsc_em_baixo",
    ];
    for (const id of ids) await correrCenario(id);

    const linhas = (listarLogs(undefined, 1000) as { historia: string }[]).map((l) => l.historia);
    expect(linhas.length).toBeGreaterThan(60);
    const falhas: string[] = [];
    for (const linha of new Set(linhas)) {
      const ingles = traduzirLogOfsc(en, linha);
      // «PATCH /resources/…/absences/abs-…» e «DELETE … — Equipa Minho» não têm português: ficam como estão.
      if (temPortugues(linha) && (ingles === linha || temPortugues(ingles))) falhas.push(`«${linha}» → «${ingles}»`);
      expect(traduzirLogOfsc(pt, linha)).toBe(linha);
    }
    expect(falhas, `Linhas da consola sem tradução:\n${falhas.join("\n")}`).toEqual([]);

    // os tipos de linha que a consola mostra nos cenários (não basta que não sobre português: têm de ter a forma certa)
    const exemplos = linhas.map((l) => traduzirLogOfsc(en, l)).join("\n");
    expect(exemplos).toMatch(/Booking confirmed: .+ on Equipa .+\. .+, installations = \d slots \(\d → \d\)\.$/m);
    expect(exemplos).not.toMatch(/\(\d → \d\) \(\d → \d\)/); // o contador já não vem repetido
    // as linhas antigas (com o contador repetido, de bases criadas antes desta correção) continuam a traduzir-se
    expect(traduzirLogOfsc(en, "Reserva Confirmada: AZ-1 na Equipa Minho. Inês Caldeira, 2026-11-03, instalações = 2 vagas (3 → 2) (3 → 2).")).toBe(
      "Booking confirmed: AZ-1 on Equipa Minho. Inês Caldeira, 2026-11-03, installations = 2 slots (3 → 2).",
    );
    expect(exemplos).toMatch(/Booking refused: Capacity exhausted\./);
    expect(exemplos).toMatch(/Duplicate event activityCreated act-.+: ignored\./);
    expect(exemplos).toMatch(/OFSC is down; queued for retry\./);
    expect(exemplos).toMatch(/cancelled\. Quota released\./);
    expect(exemplos).toMatch(/Reconciliation: /);
    expect(exemplos).toMatch(/Team absence: POST absence to every OFSC/);
  });

  it("o resultado da reserva e a nota do agente também saem em inglês", () => {
    expect(apresentarResultado(en, { decisao: "Reserva Confirmada", contador: "Inês Caldeira, 2026-11-03, instalações = 2 vagas (3 → 2)" })).toBe(
      "Booking confirmed — Inês Caldeira, 2026-11-03, installations = 2 slots (3 → 2)",
    );
    expect(apresentarResultado(en, { decisao: "Reserva Recusada", motivo: "Capacidade Esgotada" })).toBe("Booking refused — Capacity exhausted");
    expect(apresentarResultado(pt, { decisao: "Reserva Recusada", motivo: "Zona Fechada" })).toBe("Reserva Recusada — Zona Fechada");
    for (const motivo of ["Capacidade Esgotada", "Zona Fechada", "Fora da janela", "Técnico indisponível"]) {
      expect(temPortugues(apresentarResultado(en, { decisao: "Reserva Recusada", motivo }))).toBe(false);
    }

    const semChave = "Sem XAI_API_KEY: interpretador determinístico. Não preenche campos em falta.";
    expect(traduzirDetalheAgente(en, semChave)).toBe("No XAI_API_KEY: deterministic interpreter. It does not fill in missing fields.");
    expect(traduzirDetalheAgente(pt, semChave)).toBe(semChave);
    expect(traduzirDetalheAgente(en, "Modelo grok-4.20-0309-non-reasoning.")).toBe("Model grok-4.20-0309-non-reasoning.");
    expect(traduzirDetalheAgente(en, "A xAI falhou (xAI 500). Interpretador determinístico.")).toBe("xAI failed (xAI 500). Deterministic interpreter.");
    expect(traduzirDetalheAgente(en, "A xAI falhou (sem ferramenta). Interpretador determinístico.")).toBe("xAI failed (no tool call). Deterministic interpreter.");
  });

  it("o histórico da ficha, as notas e os motivos da semente saem em inglês", async () => {
    const { baseDados, lerMundo } = await import("@/server/db");
    const servicos = await import("@/server/servicos");
    baseDados();
    const central = { id: "usr-admin", nome: "Teresa Varela", papel: "administrador" as const, operadorId: null, tecnicoId: null, equipaId: null };

    // notas e motivos da semente
    const textos = lerMundo().ordens.flatMap((o) => [o.nota, o.motivoCancelamento ?? ""]).filter(Boolean);
    const semente = baseDados().prepare("SELECT detalhe FROM historico_ordens").all() as { detalhe: string }[];
    for (const texto of [...textos, ...semente.map((l) => l.detalhe)]) {
      expect(temPortugues(traduzirHistoria(en, texto)), `«${texto}» → ${traduzirHistoria(en, texto)}`).toBe(false);
      expect(traduzirHistoria(pt, texto)).toBe(texto);
    }
    expect(traduzirHistoria(en, "Integração OFSC")).toBe("OFSC integration");

    // histórico que as operações escrevem: criar, marcar, cancelar com motivo, reagendar, editar a ficha
    const dia = "2035-04-10";
    const ref = `AZ-I18N-${crypto.randomUUID().slice(0, 6)}`;
    const criada = servicos.criarOrdem(central, {
      operadorId: "azul",
      referencia: ref,
      area: "Braga",
      zonaId: "0303",
      categoria: "instalacao",
      tecnologia: null,
      data: dia,
      janelaInicio: "10:00",
      janelaFim: "12:00",
      prioridade: "media",
      clienteNome: "Cliente de teste",
      clienteContacto: "900 000 099",
      morada: "Rua Exemplo 99, Braga",
      nota: "",
      equipaId: null,
      modo: "agendar",
    });
    servicos.reagendar(central, criada.id, { inicioPlaneado: "10:30" });
    servicos.atualizarOrdem(central, criada.id, { nota: "Nota de teste" });
    // O motivo escrito pelo utilizador não se traduz (é dele): o teste usa um motivo em inglês para a verificação ser justa.
    servicos.mudarEstado(central, criada.id, "cancelada", "Customer withdrew", "cliente");
    const { historico } = servicos.obterOrdem(central, criada.id);
    expect(historico.length).toBeGreaterThanOrEqual(3);
    for (const linha of historico) {
      const ingles = traduzirHistoria(en, linha.detalhe);
      expect(temPortugues(ingles), `«${linha.detalhe}» → «${ingles}»`).toBe(false);
      expect(traduzirHistoria(pt, linha.detalhe)).toBe(linha.detalhe);
    }
    const doEstado = historico.map((l) => traduzirHistoria(en, l.detalhe)).find((d) => /^Status:/.test(d));
    expect(doEstado).toMatch(/^Status: Booked → Cancelled\. Reason: Customer withdrew\.$/);
    expect(historico.map((l) => traduzirHistoria(en, l.detalhe)).some((d) => /^Plan: \d\d:\d\d–\d\d:\d\d on 2035-04-10\.$/.test(d))).toBe(true);
  });
});
