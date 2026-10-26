export class ErroHttp extends Error {
  readonly status: number;
  readonly codigo: string;

  constructor(status: number, codigo: string, mensagem: string) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

export function exigir(condicao: boolean, status: number, codigo: string, mensagem: string): asserts condicao {
  if (!condicao) throw new ErroHttp(status, codigo, mensagem);
}
