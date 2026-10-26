import type { OperadorId } from "@/lib/rules";
import { aplicarExtracao, camposEmFalta, interpretarPedido, type ReservaParcial } from "./interpretador";
import type { CampoReserva } from "./tipos";

export const XAI_MODELO_OMISSAO = "grok-4.20-0309-non-reasoning";
export const XAI_URL = "https://api.x.ai/v1/chat/completions";

const FERRAMENTAS = [
  {
    type: "function" as const,
    function: {
      name: "preencher_reserva_ofsc",
      description: "Extrai só os campos ditos no pedido. Não inventes data, zona, janela nem técnico.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          tipoIntervencao: { type: "string", enum: ["instalacao", "manutencao", "adicional"] },
          city: { type: "string" },
          zona: { type: "string" },
          data: { type: "string" },
          horaInicio: { type: "string" },
          janelaInicio: { type: "string" },
          janelaFim: { type: "string" },
          resourceId: { type: "string" },
          apptNumber: { type: "string" },
          customerName: { type: "string" },
          streetAddress: { type: "string" },
          postalCode: { type: "string" },
        },
      },
    },
  },
];

export function modeloXai(): string {
  return process.env.XAI_MODEL?.trim() || XAI_MODELO_OMISSAO;
}

export function chaveXai(): string | undefined {
  return process.env.XAI_API_KEY?.trim() || undefined;
}

interface MensagemFerramenta {
  tool_calls?: { function: { name: string; arguments: string } }[];
  content?: string | null;
}

export async function interpretarComXai(
  texto: string,
  operadorId: OperadorId,
  fetchImpl: typeof fetch = fetch,
  hoje?: string,
): Promise<{ extraidos: ReservaParcial; emFalta: CampoReserva[]; modo: "ia" | "sem_ia"; detalhe: string }> {
  const local = interpretarPedido(texto, operadorId, hoje);
  const chave = chaveXai();
  if (!chave) {
    return {
      extraidos: local.extraidos,
      emFalta: local.emFalta,
      modo: "sem_ia",
      detalhe: "Sem XAI_API_KEY: interpretador determinístico. Não preenche campos em falta.",
    };
  }

  try {
    const resposta = await fetchImpl(XAI_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: modeloXai(),
        max_tokens: 220,
        temperature: 0,
        tools: FERRAMENTAS,
        tool_choice: "auto",
        messages: [
          {
            role: "system",
            content: "Extrai campos de reserva OFSC. Não inventes valores em falta. Usa a ferramenta.",
          },
          { role: "user", content: texto.slice(0, 400) },
        ],
      }),
    });
    if (!resposta.ok) throw new Error(`xAI ${resposta.status}`);
    const corpo = (await resposta.json()) as { choices?: { message?: MensagemFerramenta }[] };
    const chamada = corpo.choices?.[0]?.message?.tool_calls?.[0];
    if (chamada?.function?.name === "preencher_reserva_ofsc") {
      const args = JSON.parse(chamada.function.arguments) as Record<string, string>;
      const extraidos = aplicarExtracao({ operadorId }, args);
      return {
        extraidos,
        emFalta: camposEmFalta(extraidos),
        modo: "ia",
        detalhe: `Modelo ${modeloXai()}.`,
      };
    }
    throw new Error("sem ferramenta");
  } catch (erro) {
    return {
      extraidos: local.extraidos,
      emFalta: local.emFalta,
      modo: "sem_ia",
      detalhe: `A xAI falhou (${erro instanceof Error ? erro.message : "erro"}). Interpretador determinístico.`,
    };
  }
}
