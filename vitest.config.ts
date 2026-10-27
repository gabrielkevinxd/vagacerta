import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Os testes escrevem na base e não limpam. Cada execução usa uma pasta temporária própria:
// assim repetem-se sem falhar e não sujam data/vagacerta.sqlite (a base da demonstração).
const pastaDados = mkdtempSync(path.join(tmpdir(), "vagacerta-testes-"));
process.once("exit", () => {
  try {
    rmSync(pastaDados, { recursive: true, force: true });
  } catch {
    /* ficheiro ainda aberto: o sistema limpa a pasta temporária mais tarde */
  }
});

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/vazio.ts"),
    },
  },
  test: {
    environment: "node",
    // O dia rico da demonstração é fixo nos testes (determinísticos). Em uso normal é hoje, ou o próximo dia útil.
    env: { VC_DATA_DIR: pastaDados, VC_DEMO_DIA: "2026-10-27" },
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
