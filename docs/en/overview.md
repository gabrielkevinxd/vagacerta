# Overview

VagaCerta is a **shared field-visit scheduling** prototype. Three operators — Blue, Red and Green — book work on the **same teams**. Each dispatcher only sees and books their operator’s orders plus aggregated free capacity. They never see another operator’s customer record (name, address, contact).

The UI is bilingual: **European Portuguese** (default) and **English**. **PT | EN** stores the `vc_idioma` cookie and, when signed in, the account preference.

The **rich demo day** is **today** in Lisbon (or the following Monday on a weekend); `VC_DEMO_DIA=YYYY-MM-DD` pins it. It is stored in the database when it is seeded and every demo date is relative to it; run `npm run demo:reset` to get “today” again. Storage is local SQLite (`data/vagacerta.sqlite`, Node 22 `node:sqlite`). No external service is required to run the app.

Main pages: `/entrar`, `/` (dashboard), `/ordens`, `/equipas`, `/agenda` (Gantt), `/otimizador` (refit), `/gemeo` (simulate or inject), `/integracao` (OFSC), `/definicoes`, `/assistente` (chat and alerts; saves only after confirm).
