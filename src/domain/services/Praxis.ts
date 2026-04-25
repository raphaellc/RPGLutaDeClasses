import { Trabalhador } from '../entities/Trabalhador';

/**
 * Práxis Coletiva — soma da práxis individual dos trabalhadores não-colapsados,
 * ponderada pelo eixo Ação vs Inércia. Valor mínimo 1.
 */
export function praxisColetiva(trabalhadores: ReadonlyArray<Trabalhador>): number {
  const ativos = trabalhadores.filter((t) => !t.colapsado);
  if (ativos.length === 0) return 0;
  const soma = ativos.reduce((acc, t) => acc + 5 + t.eixos.acaoVsInercia, 0);
  return Math.max(1, soma);
}
