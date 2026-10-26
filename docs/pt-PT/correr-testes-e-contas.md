# Como correr, testes e contas

Requisito: **Node 22** (usa `node:sqlite`). Linux, macOS ou Windows.

```bash
npm install
npm run dev
```

Abra http://127.0.0.1:4471 . Produção local: `npm run build` e `npm start` (porta **4471**).

Windows (PowerShell), na pasta do projecto:

```powershell
npm install
npm run dev
```

Se o browser ficar em «A carregar esta secção…», apague os cookies `vc_sessao` e `vc_idioma` (ou use uma janela anónima).

```bash
npm test
npm run typecheck
npm run demo:reset    # apaga data/vagacerta.sqlite; o próximo arranque semeia de novo
```

A base cria-se sozinha na primeira leitura. Ficheiros locais ignorados: `node_modules`, `.next`, `data/*.sqlite`, `.env*`.

## Contas de demonstração

| Perfil | Correio | Palavra-passe |
| --- | --- | --- |
| Administradora Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Despachante Azul Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Despachante Vermelho Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Despachante Verde Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Técnico Rui Salgado, Equipa Minho | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |
