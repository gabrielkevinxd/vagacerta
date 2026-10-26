import { z } from "zod";
import { AREAS } from "@/lib/rules/areas";
import { CATEGORIAS, ESTADOS_ORDEM, OPERADORES, PRIORIDADES, QUEM_PEDIU, TECNOLOGIAS } from "@/lib/rules";

const hora = z.string().regex(/^\d{2}:\d{2}$/, "Use o formato HH:MM.");
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.");

export const esquemaEntrada = z.object({
  email: z.string().trim().min(3, "Indique o correio eletrónico."),
  palavraPasse: z.string().min(1, "Indique a palavra-passe."),
});

export const esquemaNovaOrdem = z.object({
  operadorId: z.enum(OPERADORES),
  referencia: z.string().trim().min(3, "Indique a referência.").max(40),
  area: z.enum(AREAS),
  zonaId: z.string().min(1),
  categoria: z.enum(CATEGORIAS),
  tecnologia: z.enum(TECNOLOGIAS).nullable(),
  data,
  janelaInicio: hora,
  janelaFim: hora,
  prioridade: z.enum(PRIORIDADES),
  clienteNome: z.string().trim().min(3, "Indique o nome do cliente.").max(80),
  clienteContacto: z.string().trim().min(5, "Indique um contacto.").max(40),
  morada: z.string().trim().min(5, "Indique a morada.").max(160),
  nota: z.string().trim().max(400).default(""),
  equipaId: z.string().nullable().optional(),
  modo: z.enum(["agendar", "espera", "pendente"]),
});

export const esquemaFicha = z.object({
  clienteNome: z.string().trim().min(3).max(80).optional(),
  clienteContacto: z.string().trim().min(5).max(40).optional(),
  morada: z.string().trim().min(5).max(160).optional(),
  nota: z.string().trim().max(400).optional(),
  prioridade: z.enum(PRIORIDADES).optional(),
});

export const esquemaEstado = z.object({
  estado: z.enum(ESTADOS_ORDEM),
  motivo: z.string().trim().max(240).optional(),
  quemPediu: z.enum(QUEM_PEDIU).optional(),
});

export const esquemaReagendar = z.object({
  equipaId: z.string().optional(),
  data: data.optional(),
  janelaInicio: hora.optional(),
  janelaFim: hora.optional(),
  inicioPlaneado: z.union([hora, z.null()]).optional(),
});

export const esquemaMarcar = z.object({
  equipaId: z.string().nullable().optional(),
});

export const esquemaPedido = z.object({
  cancelarId: z.string().optional(),
  encaixarId: z.string().optional(),
  equipaEmFalta: z.string().optional(),
  permitirTroca: z.boolean().optional(),
  apenasReferencias: z.array(z.string()).optional(),
  motivo: z.string().trim().max(240).optional(),
  data: data.optional(),
});

export const esquemaConfirmar = z.object({
  pedido: esquemaPedido,
  selo: z.string().min(16, "Falta o selo da pré-visualização."),
});

export const esquemaIndisponibilidade = z.object({
  data,
  inicio: hora,
  fim: hora,
  motivo: z.string().trim().min(3, "Indique o motivo.").max(120),
});

export const esquemaMembro = z.object({
  nome: z.string().trim().min(3, "Indique o nome.").max(80),
});

export const esquemaZona = z.object({
  zonaId: z.string().min(1),
  inicio: data,
  fim: data.nullable(),
  confirmacao: z.boolean().optional(),
});

export const esquemaEquipa = z.object({
  ativa: z.boolean().optional(),
  areas: z.array(z.enum(AREAS)).optional(),
  horarios: z
    .array(z.object({ diaSemana: z.number().int().min(1).max(7), inicio: hora, fim: hora }))
    .optional(),
  competencias: z
    .array(
      z.object({
        operadorId: z.enum(OPERADORES),
        categorias: z.array(z.enum(CATEGORIAS)),
        tecnologias: z.array(z.enum(TECNOLOGIAS)),
      }),
    )
    .optional(),
});

export const esquemaMargem = z.object({
  margemDeslocacaoMin: z.number().int().min(0).max(180),
});

export const esquemaGemeo = z.object({
  semente: z.number().int().min(1).max(999_999_999).optional(),
  semanas: z.number().int().min(1).max(4).optional(),
  replicas: z.number().int().min(1).max(8).optional(),
  procura: z.number().min(0.5).max(2).optional(),
  probabilidadeFalta: z.number().min(0).max(0.5).optional(),
  margemDeslocacaoMin: z.number().int().min(0).max(90).optional(),
  pesos: z
    .object({
      azul: z.number().min(0),
      vermelho: z.number().min(0),
      verde: z.number().min(0),
    })
    .optional(),
});
