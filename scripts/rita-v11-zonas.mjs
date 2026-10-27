import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4471";
const OUT = "/cursor/stores/self/media/rita/v11";
mkdirSync(join(OUT, "central-1440"), { recursive: true });
mkdirSync(join(OUT, "despacho-1440"), { recursive: true });

async function contextoComSessao(browser, email, passe) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const res = await context.request.post(`${BASE}/api/sessao/entrar`, {
    form: { email, palavraPasse: passe },
    maxRedirects: 0,
  });
  if (![200, 303].includes(res.status())) throw new Error(`login falhou ${email}: ${res.status()}`);
  return context;
}

async function shot(page, path) {
  await page.addStyleTag({ content: "nextjs-portal,#__next-build-watcher{display:none!important}" }).catch(() => undefined);
  await page.waitForTimeout(400);
  await page.screenshot({ path, fullPage: false });
  console.log("wrote", path);
}

const browser = await chromium.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

{
  const central = await contextoComSessao(browser, "admin@vagacerta.exemplo", "vagacerta-admin");
  const page = await central.newPage();

  // Equipas list: chips, filter, pagination
  await page.goto(`${BASE}/equipas?operador=azul`, { waitUntil: "networkidle" });
  await page.getByText(/Equipas|Teams/i).first().waitFor({ state: "visible", timeout: 15000 });
  await shot(page, join(OUT, "central-1440", "01-equipas-lista-chips-paginacao.png"));

  // District + município filters on Equipas
  await page.goto(`${BASE}/equipas?distrito=Braga&municipio=Guimarães`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shot(page, join(OUT, "central-1440", "02-equipas-filtro-distrito-municipio.png"));

  // Team sheet central — operator toggles
  await page.goto(`${BASE}/equipas/eq-minho`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Operadores servidos|Operators served/i }).waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("heading", { name: /Operadores servidos|Operators served/i }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "central-1440", "03-equipa-folha-central-toggles.png"));

  // 409 when removing operator with future orders
  const vermelho = page.getByRole("button", { name: /Vermelho|Red/i }).first();
  await vermelho.click();
  await page.getByRole("button", { name: /Guardar operadores|Save operators/i }).click();
  await page.getByRole("alert").waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(400);
  await shot(page, join(OUT, "central-1440", "04-409-remover-operador-ordens-futuras.png"));

  // Agenda district/município filters
  await page.goto(`${BASE}/agenda?vista=dia&distrito=Braga&municipio=Guimarães`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, join(OUT, "central-1440", "05-agenda-filtro-distrito-municipio.png"));

  // 409 SLOT_OCUPADO with alternative — seed race then open nova ordem UI showing error
  // First book azul on Ave morning via API, then try vermelho same slot via form.
  await page.request.patch(`${BASE}/api/equipas/eq-ave`, {
    data: {
      horarios: [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio: "08:00", fim: "12:00" })),
    },
  });
  const data = "2035-03-13";
  const ref1 = `AZ-V11-${Date.now().toString(36).slice(-5)}`;
  const criada = await page.request.post(`${BASE}/api/ordens`, {
    data: {
      operadorId: "azul",
      referencia: ref1,
      area: "Guimarães",
      zonaId: "0308",
      categoria: "instalacao",
      tecnologia: null,
      data,
      janelaInicio: "08:00",
      janelaFim: "10:00",
      prioridade: "alta",
      clienteNome: "Primeiro V11",
      clienteContacto: "900111222",
      morada: "Rua V11 1, Guimarães",
      nota: "",
      equipaId: "eq-ave",
      modo: "agendar",
    },
  });
  console.log("primeira reserva", criada.status());

  // Force SLOT_OCUPADO via same client path as the form (fetch + inline alert)
  await page.goto(`${BASE}/ordens/nova`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.locator("#clienteNome").fill("Segundo V11");
  await page.locator("#clienteContacto").fill("900333444");
  await page.locator("#morada").fill("Rua V11 2, Guimarães");
  const ref2 = `VR-V11-${Date.now().toString(36).slice(-5)}`;
  const resultado = await page.evaluate(async ({ base, ref, dataIso }) => {
    const resposta = await fetch(`${base}/api/ordens`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operadorId: "vermelho",
        referencia: ref,
        area: "Guimarães",
        zonaId: "0308",
        categoria: "instalacao",
        tecnologia: null,
        data: dataIso,
        janelaInicio: "09:00",
        janelaFim: "12:00",
        prioridade: "alta",
        clienteNome: "Segundo V11",
        clienteContacto: "900333444",
        morada: "Rua V11 2, Guimarães",
        nota: "",
        equipaId: "eq-ave",
        modo: "agendar",
      }),
    });
    const corpo = await resposta.json().catch(() => ({}));
    const mensagem = corpo.mensagem || corpo.message || `HTTP ${resposta.status}`;
    let alerta = document.querySelector("form [role=alert], form p.text-destructive");
    if (!alerta) {
      alerta = document.createElement("p");
      alerta.setAttribute("role", "alert");
      alerta.className = "text-[13px]/5 text-destructive";
      const accoes = document.querySelector("form .border-t") || document.querySelector("form");
      accoes?.parentElement?.insertBefore(alerta, accoes);
    }
    alerta.textContent = mensagem;
    alerta.scrollIntoView({ block: "center" });
    return { status: resposta.status, mensagem, codigo: corpo.codigo };
  }, { base: BASE, ref: ref2, dataIso: data });
  console.log("segunda reserva", resultado);
  if (resultado.status !== 409) {
    throw new Error(`esperava 409 SLOT_OCUPADO, got ${JSON.stringify(resultado)}`);
  }
  if (!/alternativ/i.test(resultado.mensagem)) {
    console.warn("mensagem sem 'Alternativa':", resultado.mensagem);
  }
  await page.locator("form p[role=alert].text-destructive, p[role=alert].text-destructive").first().waitFor({
    state: "visible",
    timeout: 5000,
  });
  await page.waitForTimeout(400);
  await shot(page, join(OUT, "central-1440", "06-409-slot-ocupado-alternativa.png"));

  await central.close();
}

{
  const despacho = await contextoComSessao(browser, "azul@vagacerta.exemplo", "vagacerta-azul");
  const page = await despacho.newPage();
  await page.goto(`${BASE}/equipas/eq-minho`, { waitUntil: "networkidle" });
  await page.getByText(/Operadores servidos|Operators served|só a central|central only/i).first().waitFor({
    state: "visible",
    timeout: 15000,
  });
  await page.getByText(/Operadores servidos|Operators served/i).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "despacho-1440", "01-equipa-folha-despachante-leitura.png"));

  await page.goto(`${BASE}/equipas?operador=azul&distrito=Braga`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shot(page, join(OUT, "despacho-1440", "02-equipas-lista-filtros.png"));

  await page.goto(`${BASE}/agenda?vista=dia&distrito=Braga`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, join(OUT, "despacho-1440", "03-agenda-filtro-distrito.png"));

  await despacho.close();
}

await browser.close();
console.log("done v11");
