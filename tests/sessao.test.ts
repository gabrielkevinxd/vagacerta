import { describe, expect, it } from "vitest";
import { sessaoViva } from "@/server/sessao-viva";

describe("sessão", () => {
  it("recusa um token vazio ou inventado", () => {
    expect(sessaoViva("")).toBe(false);
    expect(sessaoViva("cookie-antigo-invalido")).toBe(false);
  });
});
