import { Antagonista } from './Antagonista';
import { Organizacao } from './Organizacao';
import { Trabalhador } from './Trabalhador';

export type ModoJogo = 'simulado' | 'turnoATurno';

export type FasePartida = 'emAndamento' | 'vitoriaProletaria' | 'derrotaDoGrupo';

/**
 * Partida — agregado raiz que une jogadores, antagonistas, organização e estado de turno.
 * Agregado imutável: cada serviço retorna uma nova Partida.
 */
export interface Partida {
  readonly id: string;
  readonly modo: ModoJogo;
  readonly turno: number;            // 1-based
  readonly turnoAtivoDe: 'jogadores' | 'sistema';
  readonly trabalhadores: ReadonlyArray<Trabalhador>;
  readonly antagonistas: ReadonlyArray<Antagonista>;
  readonly organizacao: Organizacao;
  readonly fase: FasePartida;
  readonly criadaEm: string; // ISO
}
