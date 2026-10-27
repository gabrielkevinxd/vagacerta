import { describe, expect, it } from "vitest";
import { navItemAtivo } from "@/lib/nav-ativo";

describe("navItemAtivo", () => {
  it("Painel só em exact /", () => {
    expect(navItemAtivo("/", "/")).toBe(true);
    expect(navItemAtivo("/ordens", "/")).toBe(false);
    expect(navItemAtivo("/ordens/ord-az-24081", "/")).toBe(false);
    expect(navItemAtivo("/agenda", "/")).toBe(false);
  });

  it("prefixo para subrotas de Ordens e Equipas", () => {
    expect(navItemAtivo("/ordens", "/ordens")).toBe(true);
    expect(navItemAtivo("/ordens/ord-az-24081", "/ordens")).toBe(true);
    expect(navItemAtivo("/ordens/nova", "/ordens")).toBe(true);
    expect(navItemAtivo("/equipas", "/equipas")).toBe(true);
    expect(navItemAtivo("/equipas/eq-minho", "/equipas")).toBe(true);
    expect(navItemAtivo("/ordens", "/equipas")).toBe(false);
  });

  it("não ativa irmãos com prefixo partilhado", () => {
    expect(navItemAtivo("/assistente", "/agenda")).toBe(false);
    expect(navItemAtivo("/otimizador", "/ordens")).toBe(false);
  });

  it("ignora query string e barra final", () => {
    expect(navItemAtivo("/agenda?vista=dia&data=2026-10-27", "/agenda")).toBe(true);
    expect(navItemAtivo("/ordens/", "/ordens")).toBe(true);
  });
});
