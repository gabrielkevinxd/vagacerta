# Visão geral

A VagaCerta é um protótipo de **agendamento partilhado de visitas técnicas**. Três operadores — Azul, Vermelho e Verde — marcam trabalho nas **mesmas equipas**. Cada despachante só vê e marca as ordens do seu operador e a capacidade livre agregada. Nunca vê a ficha (cliente, morada, contacto) de outro operador.

A interface é bilingue: **português europeu** (predefinição) e **inglês**. O seletor **PT | EN** grava o cookie `vc_idioma` e, com sessão, a preferência na conta.

O dia rico da demonstração é **2026-10-27**. A base é SQLite local (`data/vagacerta.sqlite`, `node:sqlite` do Node 22). Não há serviço externo obrigatório.

Páginas principais: `/entrar`, `/` (painel), `/ordens`, `/equipas`, `/agenda` (Gantt), `/otimizador` (reencaixe), `/gemeo` (simular ou injetar), `/integracao` (OFSC), `/definicoes`, `/assistente` (ainda 501).
