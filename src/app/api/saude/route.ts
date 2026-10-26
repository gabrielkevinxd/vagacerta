import { publico } from "@/server/http";

export function GET() {
  return publico(async () => ({ ok: true, servico: "vagacerta" }));
}
