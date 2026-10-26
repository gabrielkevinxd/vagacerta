import { SEMENTE_GEMEO, type PedidoGemeo } from "@/lib/contratos/gemeo";

export interface PedidoSimulacao {
  semente: number;
  semanas: number;
  replicas: number;
  procura: number;
  probabilidadeFalta: number;
  margemDeslocacaoMin: number;
  pesos: { azul: number; vermelho: number; verde: number };
}

export const PEDIDO_OMISSAO: PedidoSimulacao = {
  semente: SEMENTE_GEMEO,
  semanas: 1,
  replicas: 3,
  procura: 1,
  probabilidadeFalta: 0.08,
  margemDeslocacaoMin: 15,
  pesos: { azul: 0.4, vermelho: 0.35, verde: 0.25 },
};

export const INICIO_HORIZONTE = "2026-10-26";

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function inteiro(valor: unknown, minimo: number, maximo: number): number | null {
  const n = numero(valor);
  if (n === null || !Number.isInteger(n) || n < minimo || n > maximo) return null;
  return n;
}

export function normalizarPedido(entrada: PedidoGemeo | Record<string, unknown> | undefined): PedidoSimulacao | { mensagem: string } {
  const bruto = entrada ?? {};
  const semente = inteiro(bruto.semente ?? PEDIDO_OMISSAO.semente, 1, 999_999_999);
  const semanas = inteiro(bruto.semanas ?? PEDIDO_OMISSAO.semanas, 1, 4);
  const replicas = inteiro(bruto.replicas ?? PEDIDO_OMISSAO.replicas, 1, 8);
  const procura = numero(bruto.procura ?? PEDIDO_OMISSAO.procura);
  const falta = numero(bruto.probabilidadeFalta ?? PEDIDO_OMISSAO.probabilidadeFalta);
  const margem = inteiro(bruto.margemDeslocacaoMin ?? PEDIDO_OMISSAO.margemDeslocacaoMin, 0, 90);
  const pesosBrutos = (bruto as PedidoGemeo).pesos ?? PEDIDO_OMISSAO.pesos;
  if (semente === null) return { mensagem: "A semente tem de ser um inteiro entre 1 e 999999999." };
  if (semanas === null) return { mensagem: "As semanas têm de ser um inteiro entre 1 e 4." };
  if (replicas === null) return { mensagem: "As réplicas têm de ser um inteiro entre 1 e 8." };
  if (procura === null || procura < 0.5 || procura > 2) return { mensagem: "A procura tem de estar entre 0,5 e 2." };
  if (falta === null || falta < 0 || falta > 0.5) return { mensagem: "A probabilidade de falta tem de estar entre 0 e 0,5." };
  if (margem === null) return { mensagem: "A margem de deslocação tem de ser um inteiro entre 0 e 90 minutos." };
  const azul = numero(pesosBrutos.azul);
  const vermelho = numero(pesosBrutos.vermelho);
  const verde = numero(pesosBrutos.verde);
  if (azul === null || vermelho === null || verde === null || azul < 0 || vermelho < 0 || verde < 0) {
    return { mensagem: "Os pesos dos operadores têm de ser números não negativos." };
  }
  if (azul + vermelho + verde <= 0) return { mensagem: "Indique peso a pelo menos um operador." };
  return { semente, semanas, replicas, procura, probabilidadeFalta: falta, margemDeslocacaoMin: margem, pesos: { azul, vermelho, verde } };
}
