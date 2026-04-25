import { Trabalhador } from '../entities/Trabalhador';
import { comCm, comPv } from '../value-objects/Recursos';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * Capítulo 3 — O Peso do Valor (Regras de Resolução).
 *
 * Quando uma ação individual entra em conflito com o Sistema, o trabalhador
 * rola 1d6 e soma o bônus do Eixo de Tensão apropriado:
 *
 *   total ≥ 5  → SUCESSO PLENO        (a história avança, dano total ao alvo)
 *   total 3-4  → SUCESSO COM CUSTO    (dano reduzido + custo escolhido pelo jogador)
 *   total ≤ 2  → DERROTA POÉTICA      (sem dano; o Sistema esmaga a iniciativa)
 *
 * Custos do Sucesso com Custo (escolha do jogador):
 *   'pv'        : –2 Tempo de Vida
 *   'cm'        : –1 Condição Material
 *   'alienacao' : ganha 1 tique de Alienação por 2 turnos
 *
 * Derrota poética: –3 PV (o Sistema esmaga a iniciativa).
 *
 * Domínio puro: a rolagem em si vive em /application/use-cases/IniciarAcaoDireta.ts
 * (injeta a porta Dado). Aqui só tratamos da matemática e da aplicação.
 */
export type EixoNome = 'suorVsSonho' | 'conscienciaVsRuido' | 'acaoVsInercia';
export type ResultadoAcao = 'sucessoPleno' | 'sucessoComCusto' | 'derrota';
export type CustoSucessoComCusto = 'pv' | 'cm' | 'alienacao';

export interface Rolagem {
  /** Valor cru do d6 (1-6). */
  readonly d6: number;
  /** Bônus aplicado a partir do eixo escolhido. */
  readonly bonus: number;
  /** d6 + bônus. */
  readonly total: number;
  /** Classificação resultante. */
  readonly resultado: ResultadoAcao;
  /** Eixo usado para o bônus. */
  readonly eixo: EixoNome;
}

export interface ParametrosAcaoDireta {
  /** Texto narrativo do que o trabalhador tenta fazer. */
  readonly intencao: string;
  /** Eixo de tensão para o bônus. */
  readonly eixo: EixoNome;
  /** Se a ação ataca um antagonista, dano ao Capital em sucesso pleno. */
  readonly danoAoCapitalSeSucesso?: number;
}

export function bonusEixo(t: Trabalhador, eixo: EixoNome): number {
  switch (eixo) {
    case 'suorVsSonho':
      return t.eixos.suorVsSonho;
    case 'conscienciaVsRuido':
      return t.eixos.conscienciaVsRuido;
    case 'acaoVsInercia':
      return t.eixos.acaoVsInercia;
  }
}

export function classificarTotal(total: number): ResultadoAcao {
  if (total >= 5) return 'sucessoPleno';
  if (total >= 3) return 'sucessoComCusto';
  return 'derrota';
}

const CUSTO_PV_SUCESSO_COM_CUSTO = 2;
const CUSTO_CM_SUCESSO_COM_CUSTO = 1;
const TURNOS_ALIENACAO_DO_CUSTO = 2;
const DANO_DERROTA_POETICA = 3;

export interface ResultadoAplicacao {
  readonly executor: Trabalhador;
  readonly danoAoCapital: number;
  readonly eventos: EventoPartida[];
}

/**
 * Aplica o resultado da rolagem ao executor. Não toca no antagonista —
 * o caller (caso de uso) é quem subtrai `danoAoCapital` do alvo escolhido.
 *
 * @param custo  Escolha obrigatória apenas em 'sucessoComCusto'. Em outros
 *               resultados o parâmetro é ignorado.
 */
export function aplicarResultadoAcao(
  executor: Trabalhador,
  rolagem: Rolagem,
  parametros: ParametrosAcaoDireta,
  custo: CustoSucessoComCusto = 'cm',
): ResultadoAplicacao {
  if (executor.colapsado) {
    return { executor, danoAoCapital: 0, eventos: [] };
  }

  const eventos: EventoPartida[] = [
    {
      tipo: 'rolagem',
      valor: rolagem.total,
      resultado: rolagem.resultado,
    },
  ];

  switch (rolagem.resultado) {
    case 'sucessoPleno': {
      const dano = parametros.danoAoCapitalSeSucesso ?? 0;
      eventos.push({
        tipo: 'narrativa',
        texto: `${executor.nome}: ${parametros.intencao} — SUCESSO PLENO (${rolagem.total}).`,
      });
      return { executor, danoAoCapital: dano, eventos };
    }

    case 'sucessoComCusto': {
      // Dano reduzido (metade arredondada para baixo, mínimo 1 se houver alvo).
      const danoBase = parametros.danoAoCapitalSeSucesso ?? 0;
      const dano = danoBase > 0 ? Math.max(1, Math.floor(danoBase / 2)) : 0;
      let novoExec = executor;
      if (custo === 'pv') {
        const novosRecursos = comPv(novoExec.recursos, novoExec.recursos.pv - CUSTO_PV_SUCESSO_COM_CUSTO, novoExec.limites);
        novoExec = { ...novoExec, recursos: novosRecursos, colapsado: novosRecursos.pv <= 0 };
      } else if (custo === 'cm') {
        novoExec = { ...novoExec, recursos: comCm(novoExec.recursos, novoExec.recursos.cm - CUSTO_CM_SUCESSO_COM_CUSTO, novoExec.limites) };
      } else {
        // Alienação respeita imunidade — se estiver imune, o "tique" se dissipa.
        if (novoExec.imunidadeStatusTurnos === 0) {
          const existente = novoExec.status.find((s) => s.tipo === 'alienacao');
          const status = existente
            ? novoExec.status.map((s) =>
                s.tipo === 'alienacao'
                  ? { tipo: 'alienacao' as const, turnosRestantes: Math.max(s.turnosRestantes, TURNOS_ALIENACAO_DO_CUSTO) }
                  : s,
              )
            : [...novoExec.status, { tipo: 'alienacao' as const, turnosRestantes: TURNOS_ALIENACAO_DO_CUSTO }];
          novoExec = { ...novoExec, status };
          eventos.push({ tipo: 'statusAplicado', alvoId: novoExec.id, status: 'alienacao', turnos: TURNOS_ALIENACAO_DO_CUSTO });
        }
      }
      eventos.push({
        tipo: 'narrativa',
        texto: `${executor.nome}: ${parametros.intencao} — SUCESSO COM CUSTO (${rolagem.total}, ${legendaCusto(custo)}).`,
      });
      if (novoExec.colapsado && !executor.colapsado) {
        eventos.push({ tipo: 'colapso', trabalhadorId: novoExec.id });
      }
      return { executor: novoExec, danoAoCapital: dano, eventos };
    }

    case 'derrota': {
      const novosRecursos = comPv(executor.recursos, executor.recursos.pv - DANO_DERROTA_POETICA, executor.limites);
      const novoExec: Trabalhador = {
        ...executor,
        recursos: novosRecursos,
        colapsado: novosRecursos.pv <= 0,
      };
      eventos.push({
        tipo: 'narrativa',
        texto: `${executor.nome}: ${parametros.intencao} — DERROTA POÉTICA (${rolagem.total}). O Sistema esmaga a iniciativa (–${DANO_DERROTA_POETICA} PV).`,
      });
      if (novoExec.colapsado && !executor.colapsado) {
        eventos.push({ tipo: 'colapso', trabalhadorId: novoExec.id });
      }
      return { executor: novoExec, danoAoCapital: 0, eventos };
    }
  }
}

function legendaCusto(c: CustoSucessoComCusto): string {
  switch (c) {
    case 'pv': return '–2 PV';
    case 'cm': return '–1 CM';
    case 'alienacao': return '+1 tique de Alienação';
  }
}
