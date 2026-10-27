import { t, type Chave, type Mensagens } from "./index";
import { ptPT } from "./pt-PT";

/**
 * Tradução das frases que o motor de regras e o servidor escrevem em português e que chegam à interface.
 *
 * O motor, os serviços e a consola OFSC escrevem texto em PT (é o idioma da base e dos registos). A interface
 * traduz na fronteira, quando o idioma é inglês:
 *  - `traduzirMensagem`   erros da API e do motor (frases exatas, com parâmetros, ou de várias frases);
 *  - `traduzirNarrativa`  planos de reencaixe e pré-visualizações;
 *  - `traduzirHistoria`   histórico da ficha, notas da semente, motivos e autor;
 *  - `traduzirLogOfsc`    linhas de história da consola de integração;
 *  - `traduzirDetalheAgente` nota do agente («Modo sem IA …»);
 *  - `apresentarResultado` a decisão que o formulário de reserva mostra.
 * Em PT devolvem sempre o texto original: o português não muda.
 */

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
  "O técnico não cancela nem repõe ordens.": "erros.tecnicoNaoRepor",
  "O técnico não cancela ordens.": "erros.tecnicoNaoCancela",
  "Sem acesso a esta ordem.": "erros.semAcessoOrdem",
  "Não pode marcar ordens deste operador.": "erros.naoMarcaOperador",
  "Não pode reagendar esta ordem.": "erros.naoReagenda",
  "Não pode mudar esta ordem para esse estado.": "erros.naoMudaEstado",
  "Um despachante não marca visitas em dias já passados.": "erros.naoMarcaPassado",
  "A área não está na lista de localidades.": "erros.areaInvalida",
  "Cancelar exige um motivo.": "erros.cancelarMotivo",
  "Indique quem pediu o cancelamento.": "erros.quemPediu",
  "Esta ordem já está cancelada.": "erros.JA_CANCELADA",
  "Esta ordem já não pode ser cancelada.": "erros.naoCancelavel",
  "Uma ordem concluída ou cancelada não pode ser alterada.": "erros.fichaSoLeitura",
  "O horário original já está ocupado.": "erros.horaOcupada",
  "Só a central corre cenários de integração.": "erros.soCentralCenarios",
  "Só a central altera a saúde OFSC.": "erros.soCentralSaude",
  "Só uma ordem cancelada pode ser reposta.": "erros.naoRepor",
  "Indique um intervalo de datas válido.": "erros.agendaIntervalo",
  "O intervalo da agenda não pode passar de 15 dias.": "erros.agenda15",
  "Sem acesso a estas vagas.": "erros.semVagas",
  "Só vê a capacidade do seu operador.": "erros.soCapacidadePropria",
  "O técnico não acede à integração OFSC.": "erros.tecnicoSemIntegracao",
  "Esta área não está disponível para o perfil de técnico.": "acesso.soNaoTecnico",
  "Só a central reconcilia a integração OFSC.": "erros.soCentralReconciliar",
  "Só a central pode executar esta ação.": "erros.soCentralAccao",
  "Segredo OFSC em falta ou inválido.": "erros.ofscSegredo",
  "Segredo OFSC não configurado.": "erros.ofscSegredoEmFalta",
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
  "Só a central usa a integração OFSC.": "erros.soCentralIntegracao",
  "Autenticação em falta: envie o segredo da integração ou use uma sessão da central.": "erros.integracaoAutenticacao",
  "Este endereço só aceita pedidos POST.": "erros.metodoNaoPermitido",
  "Uma visita de outro operador muda de equipa.": "narrativa.visitaOutroMuda",
  "Uma ordem de outro operador entra numa equipa.": "narrativa.ordemOutroEntra",
  "Uma ordem de outro operador volta à fila de espera.": "narrativa.ordemOutroFila",
  "A capacidade partilhada foi reorganizada. Os dados dos outros operadores ficam ocultos.": "narrativa.capacidadeReorg",
  "Falta da equipa": "narrativa.faltaEquipa",
  // Motor de regras (falha(...) e narrativa do reencaixe)
  "O Operador Verde exige uma tecnologia.": "motor.verdeExigeTecnologia",
  "A tecnologia só se aplica ao Operador Verde.": "motor.tecnologiaSoVerde",
  "Este operador não faz este tipo de serviço.": "motor.operadorSemServico",
  "A janela de início não está no catálogo deste operador.": "motor.janelaForaCatalogo",
  "A data tem de estar no formato AAAA-MM-DD.": "motor.dataFormato",
  "Indique a referência da ordem.": "motor.referenciaEmFalta",
  "A equipa não existe.": "motor.equipaNaoExiste",
  "A equipa não cobre esta área.": "motor.equipaNaoCobreArea",
  "A equipa não tem competência para este serviço.": "motor.equipaSemCompetencia",
  "Nenhuma equipa cobre a área e a competência pedidas.": "motor.semEquipa",
  "A equipa não trabalha nesse dia.": "motor.equipaNaoTrabalha",
  "Nenhuma sequência de inícios respeita as janelas prometidas.": "motor.semSequencia",
  "Não encontrámos a ordem.": "motor.ordemNaoEncontrada",
  "Esta ordem já não está por marcar.": "motor.jaNaoPorMarcar",
  "Sem motivo indicado.": "motor.semMotivo",
  "Só uma ordem agendada pode ser reagendada.": "motor.soAgendadaReagenda",
  "A ordem ficou sem equipa.": "motor.ordemSemEquipa",
  "A equipa de destino não cobre esta ordem.": "motor.destinoNaoCobre",
  "O início tem de estar no formato HH:MM.": "motor.horaFormato",
  "O início pedido está fora da janela prometida.": "motor.inicioPedidoForaJanela",
  "Não encontrámos essa equipa.": "motor.equipaNaoEncontrada",
  "A falta deixa um dia sem sequência.": "motor.faltaSemSequencia",
  "O plano não se publica.": "motor.planoNaoPublica",
  "Indique o dia da falta.": "motor.indiqueDiaFalta",
  "Não encontrámos essa visita marcada.": "motor.visitaNaoEncontrada",
  "Essa ordem é de outro operador.": "motor.ordemOutroOperador",
  "Libertar capacidade para a fila de espera.": "motor.libertarCapacidade",
  "A visita sai e o dia volta a ser sequenciado.": "motor.visitaSaiReseq",
  "Essa ordem já não está na fila.": "motor.ordemForaFila",
  "Nada a reorganizar.": "motor.nadaReorganizar",
  "O plano não traz o mundo recalculado. Volte a pedir a pré-visualização.": "motor.planoSemMundo",
  "O plano enviado não é válido.": "motor.planoInvalido",
  "Esta indisponibilidade parte o dia: há visitas que deixam de caber na janela e na margem de deslocação.": "motor.indispParteDia",
  "Não encontrámos este lote de simulação.": "motor.loteNaoEncontrado",
  "Indique o motivo do cancelamento.": "motor.motivoCancelamento",
  "JSON em falta.": "motor.jsonEmFalta",
  "eventType ou operator inválido.": "motor.eventoInvalido",
  "activityId e date são obrigatórios.": "motor.eventoObrigatorios",
  "operador desconhecido": "motor.operadorDesconhecido",
};

const POR_TIPO_CONFLITO: Record<string, Chave> = {
  sequencia: "conflito.sequencia",
  janela: "conflito.janela",
  turno: "conflito.turno",
  indisponibilidade: "conflito.indisponibilidade",
  sobreposicao: "conflito.sobreposicao",
  deslocacao: "conflito.deslocacao",
};

type Valores = Record<string, (valor: string, mensagens: Mensagens) => string>;
interface Padrao {
  re: RegExp;
  chave: Chave;
  nomes: string[];
  valor?: Valores;
}

/** «a equipa» é o que o motor escreve quando a ordem não tem equipa. */
const EQUIPA_GENERICA: Valores = { equipa: (valor, m) => (valor === ptPT.motor.aEquipa ? t(m, "motor.aEquipa") : valor) };

/** Frases com parâmetros (erros e narrativa do reencaixe). */
const PADROES: Padrao[] = [
  { re: /^Faltam minutos de deslocação face à visita anterior \(margem de (\d+) min\)\.$/, chave: "conflito.deslocacao", nomes: ["n"] },
  { re: /^Este operador só marca até ([^.]+)\.$/, chave: "erros.HORIZONTE", nomes: ["limite"] },
  { re: /^A zona ([^.]+) não corresponde à área ([^.]+)\. Zonas possíveis: ([^.]+)\.$/, chave: "erros.zonaArea", nomes: ["zona", "area", "possiveis"] },
  { re: /^Campos em falta: ([^.]+)\.$/, chave: "motor.camposEmFalta", nomes: ["campos"] },
  { re: /^Encaixar ([^.]+) não cabe: nenhuma sequência respeita as janelas prometidas\.$/, chave: "motor.naoCabe", nomes: ["ref"] },
  { re: /^([^.]+) falta e o dia foi refeito com o resolvedor\.$/, chave: "motor.faltaRefeito", nomes: ["equipa"] },
  { re: /^([^.]+) deixa de ocupar a equipa\.$/, chave: "motor.deixaOcupar", nomes: ["ref"] },
  { re: /^A ([^.]+) sai de ([^.]+)\.$/, chave: "narrativa.saiDe", nomes: ["ref", "equipa"], valor: EQUIPA_GENERICA },
  { re: /^A ([^.]+) passa para ([^.]+)\.$/, chave: "narrativa.passaPara", nomes: ["ref", "equipa"], valor: EQUIPA_GENERICA },
  { re: /^A ([^.]+) volta à fila de espera\.$/, chave: "narrativa.voltaFila", nomes: ["ref"] },
  { re: /^A ([^.]+) entra às ([^.]+)\.$/, chave: "narrativa.entraAs", nomes: ["ref", "hora"] },
  { re: /^A ([^.]+) entra no dia\.$/, chave: "narrativa.entraDia", nomes: ["ref"] },
  { re: /^A ([^.]+) passa a começar às ([^.]+)\.$/, chave: "narrativa.comecaAs", nomes: ["ref", "hora"] },
  { re: /^([^.]+) muda de equipa para libertar a sequência\.$/, chave: "narrativa.mudaEquipa", nomes: ["ref"] },
  { re: /^([^.]+) sai da fila e entra na equipa que ainda tem sequência\.$/, chave: "narrativa.saiFila", nomes: ["ref"] },
  {
    re: /^([^.]+) volta à fila porque ([^.]+) falta e nenhuma outra equipa fecha o dia\.$/,
    chave: "narrativa.voltaFalta",
    nomes: ["ref", "equipa"],
  },
];

function aplicarPadrao(mensagens: Mensagens, padrao: Padrao, achado: RegExpExecArray): string {
  const vars: Record<string, string> = {};
  padrao.nomes.forEach((nome, indice) => {
    const bruto = achado[indice + 1] ?? "";
    vars[nome] = padrao.valor?.[nome]?.(bruto, mensagens) ?? bruto;
  });
  return t(mensagens, padrao.chave, vars);
}

/** Uma frase só: exata, ou com parâmetros. `null` se não a conhecemos. */
function traduzirFrase(mensagens: Mensagens, frase: string): string | null {
  const exata = POR_TEXTO[frase];
  if (exata) return t(mensagens, exata);
  for (const padrao of PADROES) {
    const achado = padrao.re.exec(frase);
    if (achado) return aplicarPadrao(mensagens, padrao, achado);
  }
  return null;
}

/** Texto de várias frases («A falta deixa um dia sem sequência. O plano não se publica.»): traduz-se se TODAS forem conhecidas. */
function traduzirVariasFrases(mensagens: Mensagens, texto: string): string | null {
  const frases = texto.split(/(?<=\.)\s+/);
  if (frases.length < 2) return null;
  const traduzidas = frases.map((frase) => traduzirFrase(mensagens, frase));
  return traduzidas.every((frase) => frase !== null) ? traduzidas.join(" ") : null;
}

export function traduzirMensagem(mensagens: Mensagens, texto: string, codigo?: string): string {
  const frase = traduzirFrase(mensagens, texto) ?? traduzirVariasFrases(mensagens, texto);
  if (frase !== null) return frase;
  // O código genérico só entra quando não conhecemos a frase: não sabe o limite, a zona nem a área.
  if (codigo && POR_CODIGO[codigo]) return t(mensagens, POR_CODIGO[codigo]);
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
  const inteira = traduzirFrase(mensagens, texto);
  if (inteira !== null) return inteira;
  return texto
    .split(/(?<=\.)\s+/)
    .map((frase) => traduzirFrase(mensagens, frase) ?? frase)
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

/** Em PT as frases do servidor já estão no idioma certo. Compara o texto (não a referência: no cliente o catálogo chega copiado). */
function emPortugues(mensagens: Mensagens): boolean {
  return mensagens.meta.descricao === ptPT.meta.descricao;
}

// ── Valores que o servidor escreve em PT dentro de frases (operadores, estados, motivos, tipos): voltam a chaves do catálogo.

function inverter(objeto: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(objeto).map(([chave, valor]) => [valor, chave]));
}

const OPERADOR_PT = inverter({ azul: ptPT.operador.azul, vermelho: ptPT.operador.vermelho, verde: ptPT.operador.verde });
const ESTADO_PT = inverter({
  pendente: ptPT.estado.pendente,
  agendada: ptPT.estado.agendada,
  em_curso: ptPT.estado.em_curso,
  concluida: ptPT.estado.concluida,
  cancelada: ptPT.estado.cancelada,
  em_espera: ptPT.estado.em_espera,
});
const MOTIVO_PT = inverter({ ...ptPT.ofsc.motivo });
const TIPO_PT = inverter({ ...ptPT.ofsc.tipo });
const DECISAO_PT = inverter({ ...ptPT.ofsc.decisao });

function valorDe(mensagens: Mensagens, tabela: Record<string, string>, prefixo: string, valorPt: string): string {
  const chave = tabela[valorPt];
  return chave ? t(mensagens, `${prefixo}.${chave}` as Chave) : valorPt;
}

const rotuloOperador = (m: Mensagens, valorPt: string) => valorDe(m, OPERADOR_PT, "operador", valorPt);
const rotuloEstado = (m: Mensagens, valorPt: string) => valorDe(m, ESTADO_PT, "estado", valorPt);

/** «Técnico 1» / «Técnico» são nomes genéricos do servidor; os nomes verdadeiros (Inês Caldeira…) não se mexem. */
function nomeTecnico(m: Mensagens, nome: string): string {
  const generico = new RegExp(`^${ptPT.ofsc.tecnicoGenerico}( \\d+)?$`).exec(nome);
  return generico ? `${t(m, "ofsc.tecnicoGenerico")}${generico[1] ?? ""}` : nome;
}

const CONTADOR = /^(.+), (\d{4}-\d{2}-\d{2}), (instalações|manutenções|adicionais) = (\d+) vagas \((\d+) → (\d+)\)$/;

/** «Inês Caldeira, 2026-11-03, instalações = 2 vagas (3 → 2)»: o contador N → N-1 da consola. */
function traduzirContador(m: Mensagens, texto: string): string | null {
  const achado = CONTADOR.exec(texto);
  if (!achado) return null;
  const [, tecnico = "", data = "", tipo = "", para = "", de = ""] = achado;
  return t(m, "ofsc.contador", { tecnico: nomeTecnico(m, tecnico), data, tipo: valorDe(m, TIPO_PT, "ofsc.tipo", tipo), para, de });
}

// ── Histórico da ficha, notas da semente, motivos e autor

const TEXTOS_DE_DADOS: Record<string, Chave> = {
  "Dados da ordem atualizados.": "historia.atualizada",
  "Ordem de demonstração marcada na Equipa Minho.": "historia.demoMarcada",
  "Ficou em fila de espera: a Equipa Minho não fecha o dia com as três instalações.": "historia.demoFila",
  "O cliente adiou a visita.": "historia.clienteAdiou",
  "Cancelamento OFSC": "historia.cancelamentoOfsc",
  "Formação de segurança": "historia.formacaoSeguranca",
  "Falta de manhã": "historia.faltaManha",
  "Falta de tarde": "historia.faltaTarde",
  "Integração OFSC": "historia.autorOfsc",
  "Sem motivo indicado.": "motor.semMotivo",
  "Libertar capacidade para a fila de espera.": "motor.libertarCapacidade",
  "Visita já executada na demonstração.": "historia.notas.executada",
  "O técnico marcou a visita como em curso.": "historia.notas.emCurso",
  "Instalação de 3 h. Começar às 10:00 ocupa a equipa até às 13:00.": "historia.notas.tresHoras",
  "Cabe com a instalação azul se o início desta deslizar dentro da janela.": "historia.notas.cabeSeDesliza",
  "A formação das 12:00 às 14:00 impede encaixar aqui a instalação das 09:00.": "historia.notas.formacao",
  "A manhã fica livre para receber uma instalação vinda da Equipa Minho.": "historia.notas.manhaLivre",
  "Não cabe na Equipa Minho enquanto a instalação azul e a vermelha dividem o dia.": "historia.notas.naoCabeMinho",
  "À espera de um intervalo na Equipa Barroso.": "historia.notas.esperaBarroso",
  "Trabalho adicional, sem urgência.": "historia.notas.adicionalSemUrgencia",
  "A Equipa Litoral já tem alarmes de manhã.": "historia.notas.alarmesManha",
  "Registada pelo despachante, ainda sem tentativa de encaixe.": "historia.notas.pendenteDespachante",
};

/**
 * Texto de dados escrito pelo servidor em PT e mostrado na ficha: histórico, notas da semente, motivo de cancelamento e autor.
 * Texto livre do utilizador (uma nota própria, um motivo) não é conhecido e fica como foi escrito.
 */
export function traduzirHistoria(mensagens: Mensagens, texto: string): string {
  if (emPortugues(mensagens) || !texto) return texto;
  const conhecido = TEXTOS_DE_DADOS[texto];
  if (conhecido) return t(mensagens, conhecido);
  const criada = /^(.+) criada \((.+)\)\.$/.exec(texto);
  if (criada) return t(mensagens, "historia.criada", { ref: criada[1] ?? "", estado: rotuloEstado(mensagens, criada[2] ?? "") });
  const estado = /^Estado: (.+) → ([^.]+)\.(?: Motivo: (.+)\.)?$/.exec(texto);
  if (estado) {
    const de = rotuloEstado(mensagens, estado[1] ?? "");
    const para = rotuloEstado(mensagens, estado[2] ?? "");
    const motivo = estado[3];
    return motivo
      ? t(mensagens, "historia.estadoMotivo", { de, para, motivo: traduzirHistoria(mensagens, motivo) })
      : t(mensagens, "historia.estado", { de, para });
  }
  const plano = /^Plano: (.+)–(.+) em (\d{4}-\d{2}-\d{2})\.$/.exec(texto);
  if (plano) {
    const hora = (valor: string) => (valor === ptPT.historia.porDefinir ? t(mensagens, "historia.porDefinir") : valor);
    return t(mensagens, "historia.plano", { de: hora(plano[1] ?? ""), ate: hora(plano[2] ?? ""), data: plano[3] ?? "" });
  }
  return traduzirFrase(mensagens, texto) ?? texto;
}

// ── Consola de integração OFSC: linhas de história geradas no servidor

const OPERADOR_CURTO = "(?:Azul|Vermelho|Verde)";
const RECUSA = new RegExp(
  `^Reserva Recusada: (${Object.values(ptPT.ofsc.motivo).join("|")})\\.(?: Alternativa: (.+), (.+), (\\d{2}:\\d{2})–(\\d{2}:\\d{2}), (\\d+) vagas\\.)?$`,
);

function traduzirLogRec(m: Mensagens, texto: string): string {
  const baixo = new RegExp(`^(.+) — OFSC do (Operador ${OPERADOR_CURTO}) em baixo; ficou na fila\\.$`).exec(texto);
  if (baixo) {
    return t(m, "ofsc.log.emBaixo", { base: traduzirLogRec(m, baixo[1] ?? ""), operador: rotuloOperador(m, baixo[2] ?? "") });
  }
  const duplicado = /^Evento duplicado (\S+) (\S+): ignorado\.$/.exec(texto);
  if (duplicado) return t(m, "ofsc.log.duplicado", { tipo: duplicado[1] ?? "", atividade: duplicado[2] ?? "" });
  const enviou = new RegExp(`^OFSC do (Operador ${OPERADOR_CURTO}) enviou (\\S+) \\((\\S+), appt (.+)\\) no bucket (\\S+)\\.$`).exec(texto);
  if (enviou) {
    return t(m, "ofsc.log.enviou", {
      operador: rotuloOperador(m, enviou[1] ?? ""),
      tipo: enviou[2] ?? "",
      atividade: enviou[3] ?? "",
      appt: enviou[4] ?? "",
      bucket: enviou[5] ?? "",
    });
  }
  const cancelada = /^(\S+) cancelada\. Quota libertada\.$/.exec(texto);
  if (cancelada) return t(m, "ofsc.log.cancelada", { ref: cancelada[1] ?? "" });
  // «…, instalações = 2 vagas (3 → 2).»; as bases antigas tinham o contador repetido no fim: «… (3 → 2) (3 → 2).»
  const confirmada = /^Reserva Confirmada: (\S+) na ([^.]+)\. (.+? vagas \(\d+ → \d+\))(?: \(\d+ → \d+\))?\.$/.exec(texto);
  if (confirmada) {
    const contador = confirmada[3] ?? "";
    return t(m, "ofsc.log.confirmada", {
      ref: confirmada[1] ?? "",
      equipa: confirmada[2] ?? "",
      contador: traduzirContador(m, contador) ?? contador,
    });
  }
  const recusa = RECUSA.exec(texto);
  if (recusa) {
    const motivo = valorDe(m, MOTIVO_PT, "ofsc.motivo", recusa[1] ?? "");
    if (!recusa[2]) return t(m, "ofsc.log.recusada", { motivo });
    return t(m, "ofsc.log.recusadaAlt", {
      motivo,
      tecnico: nomeTecnico(m, recusa[2] ?? ""),
      zona: recusa[3] ?? "",
      de: recusa[4] ?? "",
      ate: recusa[5] ?? "",
      vagas: recusa[6] ?? "",
    });
  }
  const falta = /^Falta da equipa (\S+) em (\S+): ausências em todos os operadores\.$/.exec(texto);
  if (falta) return t(m, "ofsc.log.falta", { equipa: falta[1] ?? "", data: falta[2] ?? "" });
  const faltaPost = /^Falta da equipa: POST ausência em todos os OFSC \((\S+)\)\.$/.exec(texto);
  if (faltaPost) return t(m, "ofsc.log.faltaPost", { recurso: faltaPost[1] ?? "" });
  const atividade = /^Atividade (\S+) \((.*)\) no bucket (\S+)\.$/.exec(texto);
  if (atividade) return t(m, "ofsc.log.atividade", { id: atividade[1] ?? "", appt: atividade[2] ?? "", bucket: atividade[3] ?? "" });
  const patch = new RegExp(`^(${Object.values(ptPT.ofsc.decisao).join("|")}): PATCH /activities/(\\S+) com resourceId (.+)\\.$`).exec(texto);
  if (patch) {
    return t(m, "ofsc.log.patchAtividade", {
      decisao: valorDe(m, DECISAO_PT, "ofsc.decisao", patch[1] ?? ""),
      id: patch[2] ?? "",
      recurso: patch[3] ?? "",
    });
  }
  const reconciliacao = new RegExp(`^Reconciliação: (\\S+) (\\S+) no (Operador ${OPERADOR_CURTO})\\.$`).exec(texto);
  if (reconciliacao) {
    return t(m, "ofsc.log.reconciliacao", {
      metodo: reconciliacao[1] ?? "",
      caminho: reconciliacao[2] ?? "",
      operador: rotuloOperador(m, reconciliacao[3] ?? ""),
    });
  }
  // «POST /resources/…/absences — contador», «DELETE /resources/…/absences/… — Técnico»: o prefixo é HTTP, o resto pode ser PT.
  const ausencia = /^((?:POST|PATCH|DELETE) \/resources\/\S+\/absences(?:\/\S+)?) — (.+)$/.exec(texto);
  if (ausencia) {
    const resto = ausencia[2] ?? "";
    return `${ausencia[1]} — ${traduzirContador(m, resto) ?? nomeTecnico(m, resto)}`;
  }
  return texto;
}

/** Linha de história da consola de integração (coluna «OFSC do operador», «VagaCerta» ou «OFSC dos outros»). */
export function traduzirLogOfsc(mensagens: Mensagens, texto: string): string {
  if (emPortugues(mensagens) || !texto) return texto;
  return traduzirLogRec(mensagens, texto);
}

/** O que o formulário de reserva mostra depois de confirmar: «Reserva Confirmada — Técnico, data, instalações = 2 vagas (3 → 2)». */
export function apresentarResultado(
  mensagens: Mensagens,
  resultado: { decisao?: string; motivo?: string; contador?: string },
): string {
  const partes = [
    resultado.decisao ? valorDe(mensagens, DECISAO_PT, "ofsc.decisao", resultado.decisao) : "",
    resultado.motivo ? valorDe(mensagens, MOTIVO_PT, "ofsc.motivo", resultado.motivo) : "",
    resultado.contador ? (traduzirContador(mensagens, resultado.contador) ?? resultado.contador) : "",
  ];
  return partes.filter(Boolean).join(" — ");
}

/** Nota do agente («Modo sem IA — …»): o interpretador escreve-a em PT. */
export function traduzirDetalheAgente(mensagens: Mensagens, texto: string): string {
  if (emPortugues(mensagens) || !texto) return texto;
  if (texto === ptPT.ofsc.agente.semChave) return t(mensagens, "ofsc.agente.semChave");
  const modelo = /^Modelo (.+)\.$/.exec(texto);
  if (modelo) return t(mensagens, "ofsc.agente.modelo", { modelo: modelo[1] ?? "" });
  const falhou = /^A xAI falhou \((.+)\)\. Interpretador determinístico\.$/.exec(texto);
  if (falhou) {
    const erro = falhou[1] ?? "";
    const traduzido =
      erro === ptPT.ofsc.agente.semFerramenta
        ? t(mensagens, "ofsc.agente.semFerramenta")
        : erro === ptPT.ofsc.agente.erroGenerico
          ? t(mensagens, "ofsc.agente.erroGenerico")
          : erro;
    return t(mensagens, "ofsc.agente.falhou", { erro: traduzido });
  }
  return texto;
}
