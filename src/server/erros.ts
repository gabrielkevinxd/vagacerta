export class ErroHttp extends Error {
  readonly status: number;
  readonly codigo: string;
  readonly detalhes?: unknown;

  constructor(status: number, codigo: string, mensagem: string, detalhes?: unknown) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

export function exigir(condicao: boolean, status: number, codigo: string, mensagem: string): asserts condicao {
  if (!condicao) throw new ErroHttp(status, codigo, mensagem);
}
