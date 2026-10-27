import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4471";
const OUT = "/cursor/stores/self/media/rita";
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
  await page.waitForTimeout(500);
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
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, join(OUT, "central-1440", "02-painel.png"));

  await page.goto(`${BASE}/ordens/ord-vd-26004`, { waitUntil: "networkidle" });
  await shot(page, join(OUT, "central-1440", "27-ordem-concluida.png"));

  await page.goto(`${BASE}/ordens/ord-az-24081`, { waitUntil: "networkidle" });
  await shot(page, join(OUT, "central-1440", "28-breadcrumb-referencia.png"));
  await page.locator("text=Cancelar").first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "central-1440", "29-motivo-unico.png"));

  // 30: restore kept planned time — Agendada must show Ficha, Reagendar, Cancelar
  await page.goto(`${BASE}/ordens/ord-az-24140`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /^Ficha$/i }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("heading", { name: /^Reagendar$/i }).waitFor({ state: "visible", timeout: 5000 });
  await page.getByRole("heading", { name: /^Ficha$/i }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -160));
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "central-1440", "30-restaurar-hora.png"));

  // P1: sidebar active from route (not stuck on Painel)
  await page.goto(`${BASE}/ordens`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "central-1440", "31-sidebar-ordens-ativo.png"));

  await page.goto(`${BASE}/agenda?vista=dia&data=2026-10-27`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await shot(page, join(OUT, "central-1440", "32-agenda-barra-alturas.png"));

  // Seed OFSC events as central for dispatcher console evidence
  await page.request.post(`${BASE}/api/integracao/cenarios`, { data: { id: "dois_operadores" } }).catch(() => undefined);
  await page.request.post(`${BASE}/api/integracao/cenarios`, { data: { id: "vaga_livre" } }).catch(() => undefined);
  await central.close();
}

{
  const despacho = await contextoComSessao(browser, "azul@vagacerta.exemplo", "vagacerta-azul");
  const page = await despacho.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot(page, join(OUT, "despacho-1440", "02-painel.png"));

  await page.goto(`${BASE}/agenda?vista=dia&data=2026-10-27`, { waitUntil: "networkidle" });
  await shot(page, join(OUT, "despacho-1440", "06-agenda.png"));
  await shot(page, join(OUT, "despacho-1440", "31-sidebar-agenda-ativo.png"));

  await page.keyboard.press("Control+k");
  await page.waitForTimeout(600);
  await shot(page, join(OUT, "despacho-1440", "14-comando-k.png"));
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/integracao`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.locator("text=Consola").first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(400);
  await shot(page, join(OUT, "despacho-1440", "27-integracao-consola.png"));
  await shot(page, join(OUT, "despacho-1440", "09-integracao.png"));

  await page.goto(`${BASE}/ordens/ord-vd-26004`, { waitUntil: "networkidle" }).catch(() => undefined);
  // may 404 for other operator — open own cancelled if needed
  await page.goto(`${BASE}/ordens/ord-az-24081`, { waitUntil: "networkidle" });
  await shot(page, join(OUT, "despacho-1440", "12-ordem-detalhe.png"));
  await despacho.close();
}

{
  // Dispatcher Verde — Sheet on completed VD-26004: no Reagendar/Cancelar footer
  const verde = await contextoComSessao(browser, "verde@vagacerta.exemplo", "vagacerta-verde");
  const page = await verde.newPage();
  await page.goto(`${BASE}/ordens?ordem=ord-vd-26004`, { waitUntil: "networkidle" });
  await page.getByText("VD-26004").first().waitFor({ state: "visible", timeout: 10000 });
  await page.waitForTimeout(500);
  await shot(page, join(OUT, "despacho-1440", "27b-ordem-concluida-sheet.png"));
  await verde.close();
}

await browser.close();
console.log("done");
