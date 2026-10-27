# Visão geral

A VagaCerta é um protótipo de **agendamento partilhado de visitas técnicas**. Três operadores — Azul, Vermelho e Verde — marcam trabalho nas **mesmas equipas**. Cada despachante só vê e marca as ordens do seu operador e a capacidade livre agregada. Nunca vê a ficha (cliente, morada, contacto) de outro operador.

A interface é bilingue: **português europeu** (predefinição) e **inglês**. O seletor **PT | EN** grava o cookie `vc_idioma` e, com sessão, a preferência na conta.

O **dia rico** da demonstração é **hoje** em Lisboa (ou a segunda-feira seguinte, se hoje for fim de semana); `VC_DEMO_DIA=AAAA-MM-DD` fixa-o. Fica gravado na base ao semear e todas as datas da demonstração são relativas a ele; para voltar a «hoje» use `npm run demo:reset`. A base é SQLite local (`data/vagacerta.sqlite`, `node:sqlite` do Node 22). Não há serviço externo obrigatório.

Páginas principais: `/entrar`, `/` (painel), `/ordens`, `/equipas`, `/agenda` (Gantt), `/otimizador` (reencaixe), `/gemeo` (simular ou injetar), `/integracao` (OFSC), `/definicoes`, `/assistente` (ainda 501).
