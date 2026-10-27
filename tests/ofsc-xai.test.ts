import { afterEach, describe, expect, it, vi } from "vitest";
import { interpretarComXai, XAI_URL } from "@/lib/ofsc/xai";

describe("xAI OFSC", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sem chave usa o interpretador e não chama a rede", async () => {
    vi.stubEnv("XAI_API_KEY", "");
    const fetchMock = vi.fn();
    const resultado = await interpretarComXai(
      "agenda uma instalação em Braga terça às 10h para o cliente X, ref AZ-1001",
      "azul",
      fetchMock as unknown as typeof fetch,
      "2026-10-26",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultado.modo).toBe("sem_ia");
    expect(resultado.extraidos.zona).toBe("0303");
    expect(resultado.emFalta).toContain("resourceId");
  });

  it("com chave usa a ferramenta e não inventa campos em falta", async () => {
    vi.stubEnv("XAI_API_KEY", "teste");
    vi.stubEnv("XAI_MODEL", "grok-4.20-0309-non-reasoning");
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe(XAI_URL);
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: "preencher_reserva_ofsc",
                      arguments: JSON.stringify({
                        tipoIntervencao: "instalacao",
                        city: "Braga",
                        data: "2026-10-27",
                        horaInicio: "10:00",
                        customerName: "X",
                      }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      };
    });
    const resultado = await interpretarComXai("pedido", "azul", fetchMock as unknown as typeof fetch);
    expect(resultado.modo).toBe("ia");
    expect(resultado.extraidos.customerName).toBe("X");
    expect(resultado.emFalta).toEqual(expect.arrayContaining(["resourceId", "apptNumber"]));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("se a xAI falhar cai no interpretador", async () => {
    vi.stubEnv("XAI_API_KEY", "teste");
    const fetchMock = vi.fn(async () => {
      throw new Error("rede");
    });
    const resultado = await interpretarComXai(
      "agenda uma instalação em Guimarães terça às 10h para o cliente Y, ref AZ-9",
      "azul",
      fetchMock as unknown as typeof fetch,
      "2026-10-26",
    );
    expect(resultado.modo).toBe("sem_ia");
    expect(resultado.extraidos.city).toBe("Guimarães");
  });
});
