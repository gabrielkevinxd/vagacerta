import { afterEach, describe, expect, it, vi } from "vitest";
import { falarComXai } from "@/lib/assistente/xai";
import { XAI_URL } from "@/lib/ofsc/xai";

describe("xAI do assistente", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sem chave não chama a rede", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const fetchMock = vi.fn();
    const executar = vi.fn();
    const resultado = await falarComXai(
      { texto: "explica o dia", historico: [], idioma: "pt-PT", resumo: "data=2026-10-27", executar },
      fetchMock as unknown as typeof fetch,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(executar).not.toHaveBeenCalled();
    expect(resultado.modo).toBe("sem_ia");
  });

  it("com chave pede um modelo não-reasoning e executa a ferramenta", async () => {
    vi.stubEnv("XAI_API_KEY", "teste");
    vi.stubEnv("XAI_MODEL", "grok-4.20-0309-non-reasoning");
    const executar = vi.fn(() => "aceite");
    let pedido: { model?: string; max_tokens?: number; temperature?: number; reasoning_effort?: string; messages?: { content: string }[] } = {};
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(XAI_URL);
      pedido = JSON.parse(String(init.body)) as typeof pedido;
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  { function: { name: "propor_reencaixe", arguments: JSON.stringify({ modo: "encaixar", ordemId: "ord-az-fila-01" }) } },
                ],
              },
            },
          ],
        }),
      };
    });
    const resultado = await falarComXai(
      { texto: "encaixa alguma coisa por favor", historico: [], idioma: "pt-PT", resumo: "data=2026-10-27 fila=AZ-FILA-01", executar },
      fetchMock as unknown as typeof fetch,
    );
    expect(pedido.model).toBe("grok-4.20-0309-non-reasoning");
    expect(pedido.max_tokens).toBeLessThanOrEqual(180);
    expect(pedido.temperature).toBe(0);
    expect(pedido.reasoning_effort).toBeUndefined();
    expect(pedido.messages?.[0]?.content).toContain("data=2026-10-27");
    expect(resultado.modo).toBe("ia");
    expect(resultado.ferramentas[0]).toMatchObject({ nome: "propor_reencaixe", args: { modo: "encaixar", ordemId: "ord-az-fila-01" } });
    expect(executar).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("se a chamada falha devolve o modo sem IA", async () => {
    vi.stubEnv("XAI_API_KEY", "teste");
    const fetchMock = vi.fn(async () => {
      throw new Error("rede");
    });
    const resultado = await falarComXai(
      { texto: "olá", historico: [], idioma: "en", resumo: "data=2026-10-27", executar: () => "" },
      fetchMock as unknown as typeof fetch,
    );
    expect(resultado.modo).toBe("sem_ia");
    expect(resultado.texto).toBe("");
  });
});
