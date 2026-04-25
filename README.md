# O Capital · Luta de Classes

PWA do RPG **"O Capital: O Jogo da Luta de Classes"**.
Os trabalhadores são jogáveis. O Capital — Capitalista Industrial, Algoritmo-Feitor, Estado Burguês — é sempre um **NPC** comandado pela Voz do Sistema.

> "O verdadeiro monstro veste um fato de corte impecável e habita as frestas entre os segundos."

## Modos de jogo

| Modo               | Descrição                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| **Turno-a-turno**  | O usuário comanda os trabalhadores; a IA do Capital responde a cada turno.                             |
| **Simulado**       | A partida roda autonomamente: trabalhadores e antagonistas são guiados por heurísticas no mesmo motor. |

## Arquitetura

Camadas separadas, dependência apontando sempre para o domínio:

```
presentation ──┐
               ├──► application ──► domain
infrastructure ┘
```

```
src/
  domain/                     ← Pure TS — regras do jogo
    entities/                 Personagem, Trabalhador, Antagonista, Organização, Partida
    value-objects/            EixosTensão, Recursos (PV/TL/CM/CC), Status
    services/                 ExtraçãoMaisValia, Solidariedade, CicloSemanal, AçãoColetiva, ...
    events/                   EventoPartida (dado puro p/ narração e log)

  application/                ← Casos de uso e orquestração
    use-cases/                CriarPartida, AçõesDoTurno (Comando → Partida + Eventos)
    game-modes/               MotorSimulado, MotorTurnoATurno
    npc/                      EstratégiaCapital, EstratégiaProletariado (IA p/ modo simulado)
    ports/                    PartidaRepository, Logger (interfaces — adapter pattern)

  infrastructure/             ← Adaptadores
    repositories/             InMemoryPartidaRepository, LocalStoragePartidaRepository
    rng/                      DadoCriptográfico (crypto.getRandomValues), DadoDeterminístico (testes)

  presentation/               ← React + Design System
    pages/                    Início, CriaçãoPartida, PartidaTurnoATurno, PartidaSimulada
    components/               Cartões, Barras, PainelOrganização, LogNarrativo
    hooks/                    useEstadoPartida (cola UI ↔ aplicação)
    styles/                   Tokens + global (Construtivismo + Brutalismo Digital)
```

**Domínio é puro** — não importa React, DOM, fetch, localStorage. Cada serviço é uma função de dados antigos para dados novos + eventos. As entidades são imutáveis.

**Aplicação** define portas (`PartidaRepository`, `Logger`); a infra implementa.

**Apresentação** consome a aplicação por meio de um hook (`useEstadoPartida`) — nenhum componente fala com o domínio diretamente.

## Mapeamento dos requisitos funcionais

| RF / UC                            | Camada de domínio                                            |
| ---------------------------------- | ------------------------------------------------------------ |
| RF01 — atributos do trabalhador    | [`PerfilArquetipo.ts`](src/domain/services/PerfilArquetipo.ts), [`Recursos.ts`](src/domain/value-objects/Recursos.ts) |
| RF02 / UC01 — Mais-valia           | [`ExtracaoMaisValia.ts`](src/domain/services/ExtracaoMaisValia.ts) |
| RF03 / UC02 — Solidariedade        | [`Solidariedade.ts`](src/domain/services/Solidariedade.ts)   |
| RF04 / UC03 — Ciclo Semanal        | [`CicloSemanal.ts`](src/domain/services/CicloSemanal.ts)     |
| RF05+RF06 / UC04 — Evolução da Org | [`EvolucaoOrganizacao.ts`](src/domain/services/EvolucaoOrganizacao.ts) |
| RF07 / UC05 — Combate coletivo     | [`AcaoColetiva.ts`](src/domain/services/AcaoColetiva.ts)     |
| RF08 — Status (Alienação etc.)     | [`StatusService.ts`](src/domain/services/StatusService.ts)   |
| Manifestação de Massas (Nível 3)   | [`AcoesDoTurno.ts`](src/application/use-cases/AcoesDoTurno.ts) — caso `manifestacaoDeMassas` |
| Cap. 3 — Resolução por 1d6         | [`AcaoDireta.ts`](src/domain/services/AcaoDireta.ts) + [`IniciarAcaoDireta.ts`](src/application/use-cases/IniciarAcaoDireta.ts) |
| Antagonistas como NPCs             | [`EstrategiaCapital.ts`](src/application/npc/EstrategiaCapital.ts) |

### Efeitos mecânicos dos status

| Status        | Efeito                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------- |
| **Alienação** | Reduz a contribuição de práxis pela metade e bloqueia o trabalhador de doar Solidariedade |
| **Fetichismo**| Anula a mitigação por CM no cálculo de mais-valia (a mercadoria deixa de "proteger")      |
| **Imunidade** | Após Manifestação de Massas / Escola de Formação: ignora novas aplicações por N turnos    |

Status decaem 1 turno por ciclo completo (quando o turno volta para os jogadores). `Tradutor de Verdades` cura via ação **Desmistificação**.

### Resolução por 1d6 (Capítulo 3)

A **Ação Direta** é uma ação individual narrativa (sabotagem, persuasão, agitação local). O jogador descreve a intenção, escolhe um Eixo de Tensão (que dá bônus à rolagem), opcionalmente escolhe um antagonista alvo + dano se sucesso, e rola **1d6 + eixo**:

| Total | Resultado            | Efeito                                                                   |
| :---: | -------------------- | ------------------------------------------------------------------------ |
| ≥ 5   | **Sucesso Pleno**    | Dano completo ao alvo, dignidade preservada                              |
| 3-4   | **Sucesso com Custo**| Dano metade. Jogador escolhe: –2 PV, –1 CM, ou +1 tique de Alienação      |
| ≤ 2   | **Derrota Poética**  | Sem dano; o Sistema esmaga a iniciativa (–3 PV)                          |

A aleatoriedade vive isolada em [`IniciarAcaoDireta.ts`](src/application/use-cases/IniciarAcaoDireta.ts) (que injeta a porta `Dado`). O domínio em [`AcaoDireta.ts`](src/domain/services/AcaoDireta.ts) é determinístico — fácil de testar com `DadoDeterministico`.

## Como rodar

```bash
npm install
npm run dev          # Vite dev server
npm test             # Domain tests (Vitest)
npm run build        # Build de produção (PWA com vite-plugin-pwa)
npm run preview      # Pré-visualização do build
```

Requer Node 18+. O build emite manifest e service worker — instalável como PWA em qualquer navegador moderno.

## Decisões de projeto

- **Sem framework de estado global.** O domínio é imutável; o estado vive no hook `useEstadoPartida`. Trocar a UI por outro framework não exige reescrita do domínio.
- **Persistência opcional.** `LocalStoragePartidaRepository` salva a partida; `InMemoryPartidaRepository` é usado em testes. Adicionar IndexedDB ou backend remoto = nova implementação da porta, sem tocar no domínio.
- **NPCs no application/, não no domain/.** Domínio descreve o que é possível, não quem decide. As estratégias (`planejarTurnoSistema`, `planejarTurnoTrabalhadores`) só emitem `Comando`s — exatamente o que a UI emite quando o jogador clica.
- **Eventos como retorno, não exceções.** Cada serviço devolve `{ ok: false, motivo }` em vez de lançar. O log narrativo da Metrópole-Máquina é construído consumindo o stream de eventos.

## Documentação de referência

`docs/game-design-reference.txt` — texto integral do manual do RPG, incluindo capítulos do mestre, requisitos funcionais e casos de uso.
