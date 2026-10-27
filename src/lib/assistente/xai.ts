import type { Idioma } from "@/lib/i18n";
import { XAI_URL, chaveXai, modeloXai } from "@/lib/ofsc/xai";

const FERRAMENTAS = [
  {
    type: "function" as const,
    function: {
      name: "consultar_operacao",
      description: "Resumo compacto do dia visível: contagens, ocupação e fila. Sem fichas de outros operadores.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { data: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "listar_alertas",
      description: "Conflitos já calculados: sobrelotação, quotas, ausências, ordens sem técnico, sobreposições.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: { data: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "propor_reencaixe",
      description: "Escolhe uma pré-visualização. Não grava. modo encaixar, falta (só central) ou equilibrar.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          modo: { type: "string", enum: ["encaixar", "falta", "equilibrar"] },
          ordemId: { type: "string" },
          equipaId: { type: "string" },
          data: { type: "string" },
        },
        required: ["modo"],
      },
    },
  },
];

export interface ChamadaFerramenta {
  nome: string;
  args: Record<string, string>;
}

export interface ResultadoXai {
  modo: "ia" | "sem_ia";
  texto: string;
  ferramentas: ChamadaFerramenta[];
}

interface MensagemModelo {
  content?: string | null;
  tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
}

function sistema(idioma: Idioma, resumo: string): string {
  const lingua =
    idioma === "en" ? "Reply in English, at most 80 words." : "Responde em português europeu, no máximo 80 palavras.";
  return [
    "Assistente de despacho VagaCerta.",
    lingua,
    "Não inventes números: usa só o resumo ou as ferramentas.",
    "Nunca graves. propor_reencaixe só escolhe uma pré-visualização; o utilizador confirma no botão.",
    "Não reveles clientes de outros operadores.",
    `Resumo: ${resumo.slice(0, 500)}`,
  ].join(" ");
}

function argsDe(bruto: string | undefined): Record<string, string> {
  if (!bruto) return {};
  try {
    const valor = JSON.parse(bruto) as Record<string, unknown>;
    const saida: Record<string, string> = {};
    for (const [chave, item] of Object.entries(valor)) {
      if (typeof item === "string" || typeof item === "number") saida[chave] = String(item);
    }
    return saida;
  } catch {
    return {};
  }
}

export async function falarComXai(
  entrada: {
    texto: string;
    historico: { papel: "utilizador" | "assistente"; texto: string }[];
    idioma: Idioma;
    resumo: string;
    executar: (nome: string, args: Record<string, string>) => string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoXai> {
  if (!chaveXai()) return { modo: "sem_ia", texto: "", ferramentas: [] };
  const historico = entrada.historico.slice(-3).map((linha) => ({
    role: linha.papel === "assistente" ? "assistant" : "user",
    content: linha.texto.slice(0, 180),
  }));
  try {
    const resposta = await fetchImpl(XAI_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chaveXai()}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        model: modeloXai(),
        max_tokens: 180,
        temperature: 0,
        tools: FERRAMENTAS,
        tool_choice: "auto",
        messages: [
          { role: "system", content: sistema(entrada.idioma, entrada.resumo) },
          ...historico,
          { role: "user", content: entrada.texto.slice(0, 400) },
        ],
      }),
    });
    if (!resposta.ok) throw new Error(`xAI ${resposta.status}`);
    const corpo = (await resposta.json()) as { choices?: { message?: MensagemModelo }[] };
    const mensagem = corpo.choices?.[0]?.message;
    const ferramentas: ChamadaFerramenta[] = [];
    for (const chamada of (mensagem?.tool_calls ?? []).slice(0, 3)) {
      const nome = chamada.function?.name;
      if (!nome) continue;
      const args = argsDe(chamada.function?.arguments);
      ferramentas.push({ nome, args });
      entrada.executar(nome, args);
    }
    return { modo: "ia", texto: (mensagem?.content ?? "").slice(0, 1200), ferramentas };
  } catch {
    return { modo: "sem_ia", texto: "", ferramentas: [] };
  }
}
