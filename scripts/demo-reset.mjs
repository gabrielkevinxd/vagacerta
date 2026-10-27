import { rmSync } from "node:fs";
import { join } from "node:path";

const pasta = process.env.VC_DATA_DIR || "data";
for (const nome of ["vagacerta.sqlite", "vagacerta.sqlite-wal", "vagacerta.sqlite-shm"]) {
  rmSync(join(pasta, nome), { force: true });
}

console.log("Base de demonstração apagada. É recriada no próximo arranque.");
