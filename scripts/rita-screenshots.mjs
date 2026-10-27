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
  if (![200, 303].includes(res.status())) {
    throw new Error(`login falhou ${email}: ${res.status()}`);
  }
  return context;
}

async function shot(page, path) {
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
  await central.close();
}

{
  const despacho = await contextoComSessao(browser, "azul@vagacerta.exemplo", "vagacerta-azul");
  const page = await despacho.newPage();
  await page.goto(`${BASE}/integracao`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await shot(page, join(OUT, "despacho-1440", "09-integracao.png"));
  await page.locator("text=Consola").first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.waitForTimeout(400);
  await shot(page, join(OUT, "despacho-1440", "27-integracao-consola.png"));
  await despacho.close();
}

await browser.close();
console.log("done");
