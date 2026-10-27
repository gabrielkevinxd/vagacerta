import { t, type Chave, type Mensagens } from "./index";

const POR_CODIGO: Record<string, Chave> = {
  NAO_AUTENTICADO: "erros.NAO_AUTENTICADO",
  SEM_PERMISSAO: "erros.SEM_PERMISSAO",
  NAO_ENCONTRADO: "erros.NAO_ENCONTRADO",
  DADOS_INVALIDOS: "erros.DADOS_INVALIDOS",
  DATA_INVALIDA: "erros.DATA_INVALIDA",
  HORIZONTE: "erros.HORIZONTE",
  JANELA_INVALIDA: "erros.JANELA_INVALIDA",
  TECNOLOGIA_INVALIDA: "erros.TECNOLOGIA_INVALIDA",
  CATEGORIA_INVALIDA: "erros.CATEGORIA_INVALIDA",
  REFERENCIA_DUPLICADA: "erros.REFERENCIA_DUPLICADA",
  INVIAVEL: "erros.INVIAVEL",
  DESATUALIZADO: "erros.DESATUALIZADO",
  CONFLITO: "erros.CONFLITO",
  JA_CANCELADA: "erros.JA_CANCELADA",
  PASSADO: "erros.PASSADO",
  INTERVALO: "erros.INTERVALO",
  NAO_IMPLEMENTADO: "erros.NAO_IMPLEMENTADO",
  ERRO_INTERNO: "erros.ERRO_INTERNO",
  DATA: "erros.periodoDatas",
};

const POR_TEXTO: Record<string, Chave> = {
  "Não encontrámos esta ordem.": "erros.ordemNaoEncontrada",
  "Não encontrámos esta equipa.": "erros.equipaNaoEncontrada",
  "Não encontrámos este técnico nesta equipa.": "erros.tecnicoNaoEncontrado",
  "Só a central corre o gémeo digital.": "erros.soCentralGemeo",
  "Só a central muda a margem.": "erros.soCentralMargem",
  "Só a central gere equipas.": "erros.soCentralEquipas",
  "Só a central muda a zona de uma equipa.": "erros.soCentralZona",
  "Só a central acrescenta técnicos.": "erros.soCentralMembros",
  "Só a central desativa técnicos.": "erros.soCentralDesativa",
  "Só a central regista indisponibilidades.": "erros.soCentralIndisp",
  "Só a central remove indisponibilidades.": "erros.soCentralRemoveIndisp",
  "Só a central regista a falta de uma equipa.": "erros.soCentralFalta",
  "O técnico não altera a ficha do cliente.": "erros.tecnicoNaoFicha",
  "O técnico não reorganiza o dia.": "erros.tecnicoNaoReorganiza",
  "Não pode marcar ordens deste operador.": "erros.naoMarcaOperador",
  "Não pode reagendar esta ordem.": "erros.naoReagenda",
  "Não pode mudar esta ordem para esse estado.": "erros.naoMudaEstado",
  "Um despachante não marca visitas em dias já passados.": "erros.naoMarcaPassado",
  "A área não está na lista de localidades.": "erros.areaInvalida",
  "Cancelar exige um motivo.": "erros.cancelarMotivo",
  "Indique quem pediu o cancelamento.": "erros.quemPediu",
  "Esta ordem já está cancelada.": "erros.JA_CANCELADA",
  "Só uma ordem cancelada pode ser reposta.": "erros.naoRepor",
  "Indique um intervalo de datas válido.": "erros.agendaIntervalo",
  "O intervalo da agenda não pode passar de 15 dias.": "erros.agenda15",
  "Sem acesso a estas vagas.": "erros.semVagas",
  "Só vê a capacidade do seu operador.": "erros.soCapacidadePropria",
  "Indique operador, data, área e categoria para consultar vagas.": "erros.vagasCampos",
  "A equipa precisa de pelo menos uma área.": "erros.umaArea",
  "Indique o nome do técnico.": "erros.nomeTecnico",
  "A margem fica entre 0 e 180 minutos.": "erros.margemGama",
  "Com esta margem há dias que deixam de ter sequência. O valor não foi guardado.": "erros.margemInviavel",
  "O plano ficou desatualizado. Peça uma nova pré-visualização.": "erros.DESATUALIZADO",
  "Já existe uma ordem com esta referência neste operador.": "erros.REFERENCIA_DUPLICADA",
  "O correio ou a palavra-passe não conferem.": "erros.credenciais",
  "Inicie sessão para continuar.": "erros.NAO_AUTENTICADO",
  "Não foi possível concluir o pedido.": "erros.ERRO_INTERNO",
  "Os dados enviados não são válidos.": "validacao.dados",
  "Use o formato HH:MM.": "validacao.hora",
  "Use o formato AAAA-MM-DD.": "validacao.data",
  "Indique o correio eletrónico.": "validacao.email",
  "Indique a palavra-passe.": "validacao.palavra",
  "Indique a referência.": "validacao.referencia",
  "Indique o nome do cliente.": "validacao.cliente",
  "Indique um contacto.": "validacao.contacto",
  "Indique a morada.": "validacao.morada",
  "Indique o motivo.": "validacao.motivo",
  "Indique o nome.": "validacao.nome",
  "Falta o selo da pré-visualização.": "validacao.selo",
  "A semente tem de ser um inteiro entre 1 e 999999999.": "validacao.semente",
  "As semanas têm de ser um inteiro entre 1 e 4.": "validacao.semanas",
  "As réplicas têm de ser um inteiro entre 1 e 8.": "validacao.replicas",
  "A procura tem de estar entre 0,5 e 2.": "validacao.procura",
  "A probabilidade de falta tem de estar entre 0 e 0,5.": "validacao.faltas",
  "A margem de deslocação tem de ser um inteiro entre 0 e 90 minutos.": "validacao.margem",
  "Os pesos dos operadores têm de ser números não negativos.": "validacao.pesos",
  "Indique peso a pelo menos um operador.": "validacao.pesoZero",
  "Esta visita ficou sem um início que respeite a janela, o turno e a margem de deslocação.": "conflito.sequencia",
  "O início planeado está fora da janela prometida.": "conflito.janela",
  "A ocupação sai do horário da equipa.": "conflito.turno",
  "A visita cruza uma indisponibilidade da equipa.": "conflito.indisponibilidade",
  "Sobreposição com outra visita da mesma equipa.": "conflito.sobreposicao",
  "As datas do período têm de estar no formato AAAA-MM-DD.": "erros.periodoDatas",
  "O fim do período não pode ser anterior ao início.": "erros.periodoIntervalo",
  "Corrigir um período que já começou exige confirmação. O passado não se reescreve sozinho.": "erros.PASSADO",
  "O fim tem de ser depois do início.": "erros.INTERVALO",
  "Uma visita de outro operador muda de equipa.": "narrativa.visitaOutroMuda",
  "Uma ordem de outro operador entra numa equipa.": "narrativa.ordemOutroEntra",
  "Uma ordem de outro operador volta à fila de espera.": "narrativa.ordemOutroFila",
  "A capacidade partilhada foi reorganizada. Os dados dos outros operadores ficam ocultos.": "narrativa.capacidadeReorg",
  "Falta da equipa": "narrativa.faltaEquipa",
};

const POR_TIPO_CONFLITO: Record<string, Chave> = {
  sequencia: "conflito.sequencia",
  janela: "conflito.janela",
  turno: "conflito.turno",
  indisponibilidade: "conflito.indisponibilidade",
  sobreposicao: "conflito.sobreposicao",
  deslocacao: "conflito.deslocacao",
};

export function traduzirMensagem(mensagens: Mensagens, texto: string, codigo?: string): string {
  const porTexto = POR_TEXTO[texto];
  if (porTexto) return t(mensagens, porTexto);
  if (codigo && POR_CODIGO[codigo]) return t(mensagens, POR_CODIGO[codigo]);
  const deslocacao = /^Faltam minutos de deslocação face à visita anterior \(margem de (\d+) min\)\.$/.exec(texto);
  if (deslocacao) return t(mensagens, "conflito.deslocacao", { n: deslocacao[1] ?? "0" });
  const horizonte = /^Este operador só marca até (.+)\.$/.exec(texto);
  if (horizonte) return t(mensagens, "erros.HORIZONTE", { limite: horizonte[1] ?? "" });
  return texto;
}

export function traduzirConflito(mensagens: Mensagens, tipo: string, mensagem: string): string {
  if (tipo === "deslocacao") {
    const n = /(\d+)/.exec(mensagem)?.[1] ?? "0";
    return t(mensagens, "conflito.deslocacao", { n });
  }
  const chave = POR_TIPO_CONFLITO[tipo];
  return chave ? t(mensagens, chave) : traduzirMensagem(mensagens, mensagem);
}

const FRASES_NARRATIVA: { re: RegExp; chave: Chave; nomes: string[] }[] = [
  { re: /^A (.+) sai de (.+)\.$/, chave: "narrativa.saiDe", nomes: ["ref", "equipa"] },
  { re: /^A (.+) passa para (.+)\.$/, chave: "narrativa.passaPara", nomes: ["ref", "equipa"] },
  { re: /^A (.+) volta à fila de espera\.$/, chave: "narrativa.voltaFila", nomes: ["ref"] },
  { re: /^A (.+) entra às (.+)\.$/, chave: "narrativa.entraAs", nomes: ["ref", "hora"] },
  { re: /^A (.+) entra no dia\.$/, chave: "narrativa.entraDia", nomes: ["ref"] },
  { re: /^A (.+) passa a começar às (.+)\.$/, chave: "narrativa.comecaAs", nomes: ["ref", "hora"] },
  { re: /^(.+) muda de equipa para libertar a sequência\.$/, chave: "narrativa.mudaEquipa", nomes: ["ref"] },
  { re: /^(.+) sai da fila e entra na equipa que ainda tem sequência\.$/, chave: "narrativa.saiFila", nomes: ["ref"] },
  {
    re: /^(.+) volta à fila porque (.+) falta e nenhuma outra equipa fecha o dia\.$/,
    chave: "narrativa.voltaFalta",
    nomes: ["ref", "equipa"],
  },
];

const PREVISAO =
  /^(.+) passaria a (.+?)(?: na (.+))?\. O dia é recalculado com a janela prometida, a margem de deslocação, as indisponibilidades e as competências\. Nada fica gravado até confirmar\.$/;

export function traduzirNarrativa(mensagens: Mensagens, texto: string): string {
  if (!texto) return texto;
  const previsao = PREVISAO.exec(texto);
  if (previsao) {
    const lugarBruto = previsao[2] ?? "";
    const lugar = lugarBruto === "sem hora fechada" ? t(mensagens, "previsao.semHora") : lugarBruto;
    const onde = previsao[3] ? t(mensagens, "previsao.naEquipa", { equipa: previsao[3] }) : "";
    return t(mensagens, "previsao.corpo", { referencia: previsao[1] ?? "", lugar, onde });
  }
  return texto
    .split(/(?<=\.)\s+/)
    .map((frase) => {
      const directa = traduzirMensagem(mensagens, frase);
      if (directa !== frase) return directa;
      for (const padrao of FRASES_NARRATIVA) {
        const achado = padrao.re.exec(frase);
        if (!achado) continue;
        const vars: Record<string, string> = {};
        padrao.nomes.forEach((nome, indice) => {
          vars[nome] = achado[indice + 1] ?? "";
        });
        return t(mensagens, padrao.chave, vars);
      }
      return frase;
    })
    .join(" ");
}

export function traduzirPlanoVista<T extends { mensagem: string; movimentos: { motivo: string; referencia: string }[] }>(
  mensagens: Mensagens,
  plano: T,
): T {
  return {
    ...plano,
    mensagem: traduzirNarrativa(mensagens, plano.mensagem),
    movimentos: plano.movimentos.map((movimento) => ({
      ...movimento,
      referencia:
        movimento.referencia === "Outro operador" ? t(mensagens, "narrativa.outroOperador") : movimento.referencia,
      motivo: traduzirNarrativa(mensagens, movimento.motivo),
    })),
  };
}
