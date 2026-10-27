import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4471";
const OUT = "/cursor/stores/self/media/rita/v12";
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

async function escolherSelect(page, triggerId, opcao) {
  await page.locator(`#${triggerId}`).click();
  const nome = typeof opcao === "string" ? opcao : opcao;
  await page.getByRole("option", { name: nome }).click();
}

const browser = await chromium.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

{
  const central = await contextoComSessao(browser, "admin@vagacerta.exemplo", "vagacerta-admin");
  const page = await central.newPage();

  // 01 — lista densa, chips, «1–24 de N»
  await page.goto(`${BASE}/equipas?operador=azul`, { waitUntil: "networkidle" });
  await page.getByText(/1[–-]24 de|1[–-]24 of/i).first().waitFor({ state: "visible", timeout: 20000 });
  await shot(page, join(OUT, "central-1440", "01-equipas-lista-chips-paginacao.png"));

  // 02 — filtros distrito + município (chips / popover)
  await page.goto(`${BASE}/equipas?distrito=Braga&municipio=Guimarães`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await shot(page, join(OUT, "central-1440", "02-equipas-filtro-distrito-municipio.png"));

  // 03 — folha / ficha central com toggles + zona em vigor
  await page.goto(`${BASE}/equipas?equipa=eq-minho`, { waitUntil: "networkidle" });
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  await shot(page, join(OUT, "central-1440", "03-equipa-folha-central-toggles.png"));

  // 03b — ficha completa (toggles + zona)
  await page.goto(`${BASE}/equipas/eq-minho`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Operadores servidos|Operators served/i }).waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("heading", { name: /Operadores servidos|Operators served/i }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "central-1440", "03b-equipa-ficha-operadores-zona.png"));

  // 04 — 409 OPERADOR_COM_ORDENS via Dialog real + Alerta com ícone; toggles restaurados
  const vermelho = page.getByRole("button", { name: /Vermelho|Red/i }).first();
  await vermelho.click();
  await page.getByRole("button", { name: /Guardar operadores|Save operators/i }).click();
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: /Deixar de servir|Stop serving/i }).click();
  const alertaOps = page.locator(".superficie[role=alert], [role=alert].superficie").filter({ hasText: /Não foi possível|Could not|guardar|save/i });
  await alertaOps.first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);
  await shot(page, join(OUT, "central-1440", "04-409-remover-operador-ordens-futuras.png"));

  // 05 — agenda filtros distrito/município
  await page.goto(`${BASE}/agenda?vista=dia&distrito=Braga&municipio=Guimarães`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, join(OUT, "central-1440", "05-agenda-filtro-distrito-municipio.png"));

  // 06 — 409 SLOT_OCUPADO pelo formulário real (sem injectar alerta no DOM).
  // Encurtar o turno da Ave para a manhã: azul 180 min ocupa 08:00–11:00 e o
  // vermelho (155 min, janela 09:00–12:00) fica inviável — conflito real.
  const horasPatch = await page.request.patch(`${BASE}/api/equipas/eq-ave`, {
    data: {
      horarios: [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio: "08:00", fim: "12:00" })),
    },
  });
  if (![200, 204].includes(horasPatch.status())) {
    throw new Error(`falhou patch horário Ave: ${horasPatch.status()}`);
  }
  const data = "2035-03-13";
  const ref1 = `AZ-V12-${Date.now().toString(36).slice(-5)}`;
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
      clienteNome: "Primeiro V12",
      clienteContacto: "900111222",
      morada: "Rua V12 1, Guimarães",
      nota: "",
      equipaId: "eq-ave",
      modo: "agendar",
    },
  });
  const corpoCriada = await criada.json().catch(() => ({}));
  console.log("primeira reserva", criada.status(), corpoCriada.codigo || corpoCriada.id || "");
  if (![200, 201].includes(criada.status())) {
    throw new Error(`falhou reserva azul: ${criada.status()} ${JSON.stringify(corpoCriada)}`);
  }

  const qs = new URLSearchParams({
    equipaId: "eq-ave",
    area: "Guimarães",
    zonaId: "0308",
    data,
    inicio: "09:00",
    fim: "12:00",
  });
  await page.goto(`${BASE}/ordens/nova?${qs}`, { waitUntil: "networkidle" });
  await page.locator("#clienteNome").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#clienteNome").fill("Segundo V12");
  await page.locator("#clienteContacto").fill("900333444");
  await page.locator("#morada").fill("Rua V12 2, Guimarães");
  await page.locator("#operador").click();
  await page.getByRole("option", { name: /Vermelho|Red/ }).click();
  const ref2 = `VR-V12-${Date.now().toString(36).slice(-5)}`;
  await page.locator("#referencia").fill(ref2);
  const resposta409 = page.waitForResponse(
    (r) => r.url().includes("/api/ordens") && r.request().method() === "POST",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /Criar ordem|Create order/i }).click();
  const resp = await resposta409;
  if (resp.status() !== 409) {
    const corpo = await resp.text();
    throw new Error(`esperava 409 no formulário, got ${resp.status()} ${corpo.slice(0, 300)}`);
  }
  const alertaSlot = page.locator("[role=alert].superficie, .superficie[role=alert]").filter({
    hasText: /Não foi possível criar|Could not create/i,
  });
  await alertaSlot.first().waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: /Usar alternativa|Use alternative/i }).waitFor({
    state: "visible",
    timeout: 5000,
  });
  await alertaSlot.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await shot(page, join(OUT, "central-1440", "06-409-slot-ocupado-alternativa.png"));

  await central.close();
}

{
  const despacho = await contextoComSessao(browser, "azul@vagacerta.exemplo", "vagacerta-azul");
  const page = await despacho.newPage();

  // P1-9: despachante vê todas as equipas (incl. só vermelho) mas só leitura
  await page.goto(`${BASE}/equipas/eq-minho`, { waitUntil: "networkidle" });
  await page.getByText(/Operadores servidos|Operators served|só a central|central only/i).first().waitFor({
    state: "visible",
    timeout: 15000,
  });
  await page.getByText(/Operadores servidos|Operators served/i).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "despacho-1440", "01-equipa-folha-despachante-leitura.png"));

  await page.goto(`${BASE}/equipas?distrito=Braga`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await shot(page, join(OUT, "despacho-1440", "02-equipas-lista-filtros.png"));

  await page.goto(`${BASE}/agenda?vista=dia&distrito=Braga`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await shot(page, join(OUT, "despacho-1440", "03-agenda-filtro-distrito.png"));

  await despacho.close();
}

await browser.close();
console.log("done v12");
