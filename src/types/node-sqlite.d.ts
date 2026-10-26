type SqlValor = string | number | bigint | Uint8Array | null;

declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export class StatementSync {
    run(...params: SqlValor[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: SqlValor[]): Record<string, SqlValor> | undefined;
    all(...params: SqlValor[]): Record<string, SqlValor>[];
  }
}
