import { Trabalhador } from '../entities/Trabalhador';

/**
 * Práxis Coletiva — soma da práxis individual dos trabalhadores não-colapsados,
 * ponderada pelo eixo Ação vs Inércia.
 *
 * Trabalhadores sob Alienação contribuem com metade da práxis (arredondada
 * para baixo, mínimo 1) — a desconfiança mútua quebra a coordenação coletiva.
 *
 * Valor mínimo 1.
 */
export function praxisColetiva(trabalhadores: ReadonlyArray<Trabalhador>): number {
  const ativos = trabalhadores.filter((t) => !t.colapsado);
  if (ativos.length === 0) return 0;
  const soma = ativos.reduce((acc, t) => {
    const base = 5 + t.eixos.acaoVsInercia;
    const alienado = t.status.some((s) => s.tipo === 'alienacao');
    const contrib = alienado ? Math.max(1, Math.floor(base / 2)) : base;
    return acc + contrib;
  }, 0);
  return Math.max(1, soma);
}
