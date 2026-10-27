import { describe, expect, it } from "vitest";
import { migalhasDeCaminho } from "@/lib/migalhas";

describe("migalhasDeCaminho", () => {
  it("Painel só em /", () => {
    expect(migalhasDeCaminho("/")).toEqual([{ href: "/", rotuloChave: "nav.painel" }]);
  });

  it("Ordens e subrotas", () => {
    expect(migalhasDeCaminho("/ordens")).toEqual([
      { href: "/", rotuloChave: "nav.painel" },
      { href: "/ordens", rotuloChave: "nav.ordens" },
    ]);
    const detalhe = migalhasDeCaminho("/ordens/ord-az-24140");
    expect(detalhe.at(-1)).toMatchObject({ href: "/ordens/ord-az-24140", entidade: true, rotuloChave: "reencaixe.ordem" });
    const nova = migalhasDeCaminho("/ordens/nova");
    expect(nova.at(-1)).toMatchObject({ href: "/ordens/nova", rotuloChave: "painel.novaOrdem" });
  });

  it("Equipas detalhe marca entidade", () => {
    const m = migalhasDeCaminho("/equipas/eq-minho");
    expect(m.at(-1)).toMatchObject({ href: "/equipas/eq-minho", entidade: true });
  });

  it("ignora query", () => {
    expect(migalhasDeCaminho("/agenda?vista=dia").map((m) => m.href)).toEqual(["/", "/agenda"]);
  });
});
