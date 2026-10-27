import "server-only";

import { somarDiasUteis } from "@/lib/demonstracao-dia";
import type { ReservaEstruturada } from "@/lib/ofsc/tipos";
import { diaDemonstracaoAtual } from "@/server/db";
import { definirOfscEmBaixo, ofscEmBaixo } from "./loja";
import { reconciliarOfsc } from "./cliente";
import { actualizarAtividadeOfsc, criarAtividadeNoBucket } from "./criar";
import { processarEventoOfsc, publicarFaltaEquipa } from "./recetor";
import { avaliarReserva, listarGrelha } from "./grelha";

/**
 * Os cenários usam dias úteis a seguir ao dia rico da demonstração (5 dias úteis depois é a mesma
 * terça-feira da semana seguinte, 6 a quarta, 7 a quinta…): assim correm em qualquer dia, sempre em dias de trabalho.
 */
function diasDosCenarios() {
  const dia = diaDemonstracaoAtual();
  const depois = (n: number) => somarDiasUteis(dia, n);
  return {
    demonstracao: dia,
    livre: depois(5),
    quota: depois(13),
    reagendamento: depois(6),
    reagendado: depois(7),
    cancelamento: depois(8),
    falta: depois(5),
    paralelo: depois(10),
    duplicado: depois(11),
    ofscEmBaixo: depois(12),
  };
}

function reserva(
  parcial: Partial<ReservaEstruturada> & Pick<ReservaEstruturada, "operadorId" | "apptNumber">,
  dataPadrao = diasDosCenarios().livre,
): ReservaEstruturada {
  return {
    zona: "0303",
    data: dataPadrao,
    janelaInicio: "10:00",
    janelaFim: "12:00",
    tipoIntervencao: "instalacao",
    resourceId: "AZ_RES_MINHO",
    tecnicoId: "tec-rui",
    customerName: "Cliente cenário",
    streetAddress: "Rua Exemplo 1",
    city: "Braga",
    postalCode: "4700-024",
    latitude: "41.545",
    longitude: "-8.426",
    ...parcial,
  };
}

export async function correrCenario(id: string): Promise<unknown> {
  const dias = diasDosCenarios();
  switch (id) {
    case "vaga_livre": {
      const grelha = listarGrelha("azul", dias.livre, "0303", "instalacao");
      const celula = grelha[0];
      if (!celula) return { erro: "sem vaga" };
      return criarAtividadeNoBucket(
        reserva({
          operadorId: "azul",
          apptNumber: "AZ-LIVRE-1",
          resourceId: celula.resourceId,
          tecnicoId: celula.tecnicoId,
          janelaInicio: celula.janelaInicio,
          janelaFim: celula.janelaFim,
          customerName: "Ana Livre",
        }),
      );
    }
    case "capacidade_esgotada": {
      const data = dias.quota;
      const resultados = [];
      for (let i = 0; i < 4; i += 1) {
        resultados.push(
          await criarAtividadeNoBucket(
            reserva({
              operadorId: "azul",
              apptNumber: `AZ-QTA-${i + 1}`,
              data,
              resourceId: "AZ_RES_MINHO",
              janelaInicio: i % 2 === 0 ? "10:00" : "13:00",
              janelaFim: i % 2 === 0 ? "12:00" : "15:00",
              customerName: `Quota ${i + 1}`,
            }),
          ),
        );
      }
      return resultados;
    }
    case "zona_fechada":
      return avaliarReserva({
        operadorId: "azul",
        zona: "zn-inexistente",
        data: dias.livre,
        janelaInicio: "10:00",
        janelaFim: "12:00",
        tipoIntervencao: "instalacao",
        resourceId: "AZ_RES_MINHO",
      });
    case "fora_da_janela":
      return criarAtividadeNoBucket(
        reserva({
          operadorId: "azul",
          apptNumber: "AZ-FORA-1",
          janelaInicio: "03:00",
          janelaFim: "04:00",
        }),
      );
    case "tecnico_indisponivel":
      return criarAtividadeNoBucket(
        reserva({
          operadorId: "azul",
          apptNumber: "AZ-IND-1",
          data: dias.demonstracao,
          resourceId: "AZ_RES_CAVADO",
          tecnicoId: "tec-marta",
          zona: "0302",
          janelaInicio: "13:00",
          janelaFim: "15:00",
          city: "Barcelos",
        }),
      );
    case "reagendamento": {
      const criado = await criarAtividadeNoBucket(
        reserva({ operadorId: "azul", apptNumber: "AZ-REAG-1", data: dias.reagendamento, customerName: "Carla Reagenda" }),
      );
      return actualizarAtividadeOfsc("azul", criado.atividade.activityId, {
        date: dias.reagendado,
        timeSlot: { start: "13:00", end: "15:00" },
      });
    }
    case "cancelamento_reencaixe": {
      const ocupante = await criarAtividadeNoBucket(
        reserva({ operadorId: "azul", apptNumber: "AZ-CANC-1", data: dias.cancelamento, customerName: "Ocupante" }),
      );
      return actualizarAtividadeOfsc("azul", ocupante.atividade.activityId, { status: "cancelled" });
    }
    case "falta_equipa":
      publicarFaltaEquipa("eq-litoral", dias.falta, "Falta da Equipa Litoral (cenário)");
      return { ok: true, equipaId: "eq-litoral" };
    case "dois_operadores": {
      return Promise.all([
        criarAtividadeNoBucket(
          reserva({ operadorId: "azul", apptNumber: "AZ-PAR-1", data: dias.paralelo, resourceId: "AZ_RES_MINHO" }),
        ),
        criarAtividadeNoBucket(
          reserva({
            operadorId: "vermelho",
            apptNumber: "VR-PAR-1",
            data: dias.paralelo,
            resourceId: "VR_RES_AVE",
            janelaInicio: "09:00",
            janelaFim: "12:00",
          }),
        ),
      ]);
    }
    case "evento_duplicado": {
      const criado = await criarAtividadeNoBucket(
        reserva({ operadorId: "azul", apptNumber: "AZ-DUP-1", data: dias.duplicado }),
      );
      const segunda = await processarEventoOfsc({
        eventType: "activityCreated",
        operator: "azul",
        activity: criado.atividade,
      });
      return { primeira: criado.resultado, segunda };
    }
    case "ofsc_em_baixo": {
      definirOfscEmBaixo("vermelho", true);
      const criado = await criarAtividadeNoBucket(
        reserva({ operadorId: "azul", apptNumber: "AZ-DOWN-1", data: dias.ofscEmBaixo }),
      );
      const ainda = ofscEmBaixo("vermelho");
      definirOfscEmBaixo("vermelho", false);
      const recon = reconciliarOfsc();
      return { criado, vermelhoEstavaEmBaixo: ainda, recon };
    }
    default:
      throw new Error(`Cenário desconhecido: ${id}`);
  }
}
