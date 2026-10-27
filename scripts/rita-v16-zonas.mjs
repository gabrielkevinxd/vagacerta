/**
 * Capturas Rita v16 — não altera a SQLite partilhada.
 * Arranca next start com VC_DATA_DIR temporário; no fim mata o processo e apaga a pasta.
 * Mutações (horário Ave / AZ-V16) só no temp, e só depois das capturas de despacho + agenda limpa.
 */
import { chromium } from "playwright-core";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const OUT = "/cursor/stores/self/media/rita/v16";
const PORT = process.env.RITA_PORT ?? "4530";
const ROOT = new URL("..", import.meta.url).pathname;
const dataDir = mkdtempSync(join(tmpdir(), "rita-v16-"));
mkdirSync(join(OUT, "central-1440"), { recursive: true });
mkdirSync(join(OUT, "despacho-1440"), { recursive: true });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function esperarSaude(base, tentativas = 60) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(`${base}/api/saude`);
      if (res.ok) return;
    } catch {
      /* a arrancar */
    }
    await esperar(500);
  }
  throw new Error("servidor temporário não respondeu a /api/saude");
}

const servidor = spawn("npx", ["next", "start", "--hostname", "127.0.0.1", "--port", PORT], {
  cwd: ROOT,
  env: { ...process.env, VC_DATA_DIR: dataDir, PORT },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
servidor.stdout.on("data", (b) => {
  logs += b.toString();
});
servidor.stderr.on("data", (b) => {
  logs += b.toString();
});

const BASE = `http://127.0.0.1:${PORT}`;
try {
  await esperarSaude(BASE);

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

    await page.goto(`${BASE}/equipas?operador=azul`, { waitUntil: "networkidle" });
    const pag = page.getByText(/1[–-]24 de|1[–-]24 of/i).first();
    await pag.waitFor({ state: "visible", timeout: 20000 });
    await pag.scrollIntoViewIfNeeded();
    await shot(page, join(OUT, "central-1440", "01-equipas-lista-chips-paginacao.png"));

    await page.goto(`${BASE}/equipas?distrito=Braga&municipio=Guimarães`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await shot(page, join(OUT, "central-1440", "02-equipas-filtro-distrito-municipio.png"));

    await page.goto(`${BASE}/equipas?equipa=eq-minho`, { waitUntil: "networkidle" });
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(500);
    await shot(page, join(OUT, "central-1440", "03-equipa-folha-central-toggles.png"));

    await page.goto(`${BASE}/equipas/eq-minho`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Operadores servidos|Operators served/i }).waitFor({ state: "visible", timeout: 15000 });
    await page.getByRole("heading", { name: /Operadores servidos|Operators served/i }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await shot(page, join(OUT, "central-1440", "03b-equipa-ficha-operadores-zona.png"));

    await page.getByRole("button", { name: /Vermelho|Red/i }).first().click();
    await page.getByRole("button", { name: /Guardar operadores|Save operators/i }).click();
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: /Deixar de servir|Stop serving/i }).click();
    await page
      .locator(".superficie[role=alert], [role=alert].superficie")
      .filter({ hasText: /Não foi possível|Could not|guardar|save/i })
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await page.waitForTimeout(500);
    await shot(page, join(OUT, "central-1440", "04-409-remover-operador-ordens-futuras.png"));

    await page.goto(`${BASE}/agenda?vista=dia&distrito=Braga&municipio=Guimarães`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await shot(page, join(OUT, "central-1440", "05-agenda-filtro-distrito-municipio.png"));

    await page.goto(
      `${BASE}/ordens/nova?equipaId=eq-ave&area=Guimarães&zonaId=0308&data=2035-03-13&inicio=09:00&fim=12:00&operador=vermelho`,
      { waitUntil: "networkidle" },
    );
    await page.getByText(/Equipa:|Team:/i).first().waitFor({ state: "visible", timeout: 15000 });
    await shot(page, join(OUT, "central-1440", "05b-nova-ordem-equipa-preselecionada.png"));

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

    await page.goto(`${BASE}/equipas?distrito=Braga`, { waitUntil: "networkidle" });
    await page.getByRole("columnheader", { name: /Técnicos|Technicians/i }).waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(500);
    await shot(page, join(OUT, "despacho-1440", "02-equipas-lista-filtros-tecnicos.png"));

    await page.goto(`${BASE}/agenda?vista=dia&distrito=Braga`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await shot(page, join(OUT, "despacho-1440", "03-agenda-filtro-distrito.png"));

    await despacho.close();
  }

  {
    // 06 — mutações só no temp dir. Central (sem horizonte) + ?operador=vermelho
    // para não limpar equipaId ao mudar o select.
    const central = await contextoComSessao(browser, "admin@vagacerta.exemplo", "vagacerta-admin");
    const page = await central.newPage();
    const horasPatch = await page.request.patch(`${BASE}/api/equipas/eq-ave`, {
      data: {
        horarios: [1, 2, 3, 4, 5].map((diaSemana) => ({ diaSemana, inicio: "08:00", fim: "12:00" })),
      },
    });
    if (![200, 204].includes(horasPatch.status())) {
      throw new Error(`falhou patch horário Ave: ${horasPatch.status()}`);
    }
    const data = "2035-03-13";
    const criada = await page.request.post(`${BASE}/api/ordens`, {
      data: {
        operadorId: "azul",
        referencia: `AZ-V16-${Date.now().toString(36).slice(-5)}`,
        area: "Guimarães",
        zonaId: "0308",
        categoria: "instalacao",
        tecnologia: null,
        data,
        janelaInicio: "08:00",
        janelaFim: "10:00",
        prioridade: "alta",
        clienteNome: "Primeiro V16",
        clienteContacto: "900111222",
        morada: "Rua V16 1, Guimarães",
        nota: "",
        equipaId: "eq-ave",
        modo: "agendar",
      },
    });
    if (![200, 201].includes(criada.status())) {
      throw new Error(`falhou reserva azul: ${criada.status()} ${JSON.stringify(await criada.json().catch(() => ({})))}`);
    }

    const qs = new URLSearchParams({
      equipaId: "eq-ave",
      area: "Guimarães",
      zonaId: "0308",
      data,
      inicio: "09:00",
      fim: "12:00",
      operador: "vermelho",
    });
    await page.goto(`${BASE}/ordens/nova?${qs}`, { waitUntil: "networkidle" });
    await page.locator("#clienteNome").fill("Segundo V16");
    await page.locator("#clienteContacto").fill("900333444");
    await page.locator("#morada").fill("Rua V16 2, Guimarães");
    await page.locator("#referencia").fill(`VR-V16-${Date.now().toString(36).slice(-5)}`);
    const resposta409 = page.waitForResponse(
      (r) => r.url().includes("/api/ordens") && r.request().method() === "POST",
      { timeout: 15000 },
    );
    await page.getByRole("button", { name: /Criar ordem|Create order/i }).click();
    const resp = await resposta409;
    if (resp.status() !== 409) {
      throw new Error(`esperava 409, got ${resp.status()} ${(await resp.text()).slice(0, 300)}`);
    }
    const alertaSlot = page.locator("[role=alert].superficie, .superficie[role=alert]").filter({
      hasText: /Não foi possível criar|Could not create/i,
    });
    await alertaSlot.first().waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: /Mudar para|Switch to/i }).waitFor({ state: "visible", timeout: 5000 });
    await alertaSlot.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await shot(page, join(OUT, "central-1440", "06-409-slot-ocupado-alternativa.png"));
    await central.close();
  }

  await browser.close();
  console.log("done v16");
} catch (erro) {
  console.error(erro);
  console.error("--- server logs ---\n", logs.slice(-4000));
  process.exitCode = 1;
} finally {
  servidor.kill("SIGTERM");
  await esperar(800);
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
