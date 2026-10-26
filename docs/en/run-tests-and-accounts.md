# How to run, tests and demo accounts

Requires **Node 22** (`node:sqlite`). Linux, macOS or Windows.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4471 . Local production: `npm run build` then `npm start` (port **4471**).

Windows (PowerShell), from the project folder:

```powershell
npm install
npm run dev
```

If the browser sticks on “Loading this section…”, delete the `vc_sessao` and `vc_idioma` cookies (or use a private window).

```bash
npm test
npm run typecheck
npm run demo:reset    # deletes data/vagacerta.sqlite; next boot reseeds
```

The database is created on first read. Ignored locally: `node_modules`, `.next`, `data/*.sqlite`, `.env*`.

## Demo accounts

| Profile | Email | Password |
| --- | --- | --- |
| Administrator Teresa Varela | admin@vagacerta.exemplo | vagacerta-admin |
| Supervisor Miguel Dantas | supervisor@vagacerta.exemplo | vagacerta-supervisor |
| Blue dispatcher Clara Monteiro | azul@vagacerta.exemplo | vagacerta-azul |
| Red dispatcher Gonçalo Pires | vermelho@vagacerta.exemplo | vagacerta-vermelho |
| Green dispatcher Beatriz Lamego | verde@vagacerta.exemplo | vagacerta-verde |
| Technician Rui Salgado, Minho team | tecnico.minho@vagacerta.exemplo | vagacerta-tecnico |
