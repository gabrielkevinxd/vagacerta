import { rmSync } from "node:fs";
import { join } from "node:path";

for (const nome of ["vagacerta.sqlite", "vagacerta.sqlite-wal", "vagacerta.sqlite-shm"]) {
  rmSync(join("data", nome), { force: true });
}

console.log("Base de demonstração apagada. É recriada no próximo arranque.");
