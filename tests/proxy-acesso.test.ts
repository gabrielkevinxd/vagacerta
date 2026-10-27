import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { baseDados } from "@/server/db";
import { abrirSessao, CONTAS } from "./http-simulado";

function pagina(caminho: string, token?: string, idioma?: string): NextRequest {
  const cookies = [token ? `vc_sessao=${token}` : "", idioma ? `vc_idioma=${idioma}` : ""].filter(Boolean).join("; ");
  return new NextRequest(`http://127.0.0.1:4472${caminho}`, { headers: cookies ? { cookie: cookies } : {} });
}

function segue(resposta: Response): boolean {
  return resposta.headers.get("x-middleware-next") === "1";
}

async function corpo(resposta: Response): Promise<string> {
  return resposta.text();
}

describe("B4: ordem de outro operador ou inexistente dá a página «Ordem não encontrada» com 404", () => {
  beforeAll(() => {
    baseDados();
  });

  it("despachante Azul a abrir a ordem do Vermelho (VR-90001): 404 com a página em HTML", async () => {
    const resposta = proxy(pagina("/ordens/ord-vr-90001", abrirSessao(CONTAS.azul)));
    expect(resposta.status).toBe(404);
    expect(resposta.headers.get("content-type")).toContain("text/html");
    expect(resposta.headers.get("cache-control")).toBe("no-store");
    const html = await corpo(resposta);
    expect(html).toContain("<h1>Ordem não encontrada</h1>");
    expect(html).toContain('lang="pt-PT"');
    expect(html).toContain('<a href="/ordens">Voltar às ordens</a>');
    expect(html).not.toMatch(/Minified React error/i);
  });

  it("a resposta é a mesma para uma ordem inexistente (não confirma que a ordem alheia existe)", async () => {
    const token = abrirSessao(CONTAS.azul);
    const alheia = proxy(pagina("/ordens/ord-vr-90001", token));
    const inexistente = proxy(pagina("/ordens/ord-nao-existe-123", token));
    expect(inexistente.status).toBe(404);
    expect(await corpo(inexistente)).toBe(await corpo(alheia));
  });

  it("em inglês diz «Order not found»", async () => {
    const resposta = proxy(pagina("/ordens/ord-vr-90001", abrirSessao(CONTAS.azul), "en"));
    expect(resposta.status).toBe(404);
    const html = await corpo(resposta);
    expect(html).toContain("<h1>Order not found</h1>");
    expect(html).toContain('lang="en"');
    expect(html).toContain("Back to orders");
  });

  it("administradora e supervisor abrem qualquer ordem", () => {
    for (const perfil of ["admin", "supervisor"] as const) {
      const resposta = proxy(pagina("/ordens/ord-vr-90001", abrirSessao(CONTAS[perfil])));
      expect(resposta.status).toBe(200);
      expect(segue(resposta)).toBe(true);
    }
  });

  it("despachante Azul abre a ordem do próprio operador (AZ-24081)", () => {
    const resposta = proxy(pagina("/ordens/ord-az-24081", abrirSessao(CONTAS.azul)));
    expect(resposta.status).toBe(200);
    expect(segue(resposta)).toBe(true);
  });

  it("técnico da Equipa Minho: ordem da Minho abre; ordem de outra equipa dá 404", () => {
    const token = abrirSessao(CONTAS.tecnico);
    expect(segue(proxy(pagina("/ordens/ord-az-24081", token)))).toBe(true);
    expect(proxy(pagina("/ordens/ord-az-24120", token)).status).toBe(404);
  });

  it("equipa de outra equipa (técnico) ou inexistente: 404 «Equipa não encontrada»; a própria equipa e a central abrem", async () => {
    const tecnico = abrirSessao(CONTAS.tecnico);
    expect(segue(proxy(pagina("/equipas/eq-minho", tecnico)))).toBe(true);
    const alheia = proxy(pagina("/equipas/eq-cavado", tecnico));
    expect(alheia.status).toBe(404);
    expect(await corpo(alheia)).toContain("<h1>Equipa não encontrada</h1>");
    expect(proxy(pagina("/equipas/eq-inexistente", abrirSessao(CONTAS.admin))).status).toBe(404);
    expect(segue(proxy(pagina("/equipas/eq-cavado", abrirSessao(CONTAS.azul))))).toBe(true);
    expect(segue(proxy(pagina("/equipas/eq-cavado", abrirSessao(CONTAS.admin))))).toBe(true);
  });

  it("/ordens/nova e a lista /ordens não são tratadas como identificadores", () => {
    const token = abrirSessao(CONTAS.azul);
    expect(segue(proxy(pagina("/ordens/nova", token)))).toBe(true);
    expect(segue(proxy(pagina("/ordens", token)))).toBe(true);
  });

  it("um identificador com «%» mal formado não rebenta o proxy (404)", () => {
    expect(proxy(pagina("/ordens/%E0%A4%A", abrirSessao(CONTAS.azul))).status).toBe(404);
  });

  it("sem sessão continua a ir para /entrar", () => {
    const resposta = proxy(pagina("/ordens/ord-az-24081"));
    expect(resposta.status).toBe(307);
    expect(resposta.headers.get("location")).toContain("/entrar");
  });
});

describe("B2: a página /integracao bloqueia o técnico; despachante e central entram", () => {
  it("técnico recebe 403", async () => {
    const resposta = proxy(pagina("/integracao", abrirSessao(CONTAS.tecnico)));
    expect(resposta.status).toBe(403);
    const html = await corpo(resposta);
    expect(html).toContain("<h1>Integração OFSC</h1>");
    expect(html).toMatch(/perfil de técnico|técnico/i);
  });

  it("em inglês o técnico vê a mensagem do perfil", async () => {
    const resposta = proxy(pagina("/integracao", abrirSessao(CONTAS.tecnico), "en"));
    expect(resposta.status).toBe(403);
    expect(await corpo(resposta)).toMatch(/technician/i);
  });

  it("despachante e central seguem para a página", () => {
    for (const perfil of ["admin", "supervisor", "azul", "vermelho", "verde"] as const) {
      const resposta = proxy(pagina("/integracao", abrirSessao(CONTAS[perfil])));
      expect(resposta.status, perfil).toBe(200);
      expect(segue(resposta)).toBe(true);
    }
  });
});
