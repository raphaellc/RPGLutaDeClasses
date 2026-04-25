/**
 * Eixos de Tensão — definem a inclinação do personagem entre forças opostas.
 * Cada eixo varia em [-3, +3]. Valores positivos favorecem o polo "revolucionário",
 * negativos favorecem o polo "alienante". Ver Capítulo 1 do manual.
 */
export interface EixosTensao {
  readonly suorVsSonho: number;        // Suor (-) ↔ Sonho (+) — Força de Trabalho
  readonly conscienciaVsRuido: number; // Ruído (-) ↔ Consciência (+)
  readonly acaoVsInercia: number;      // Inércia (-) ↔ Ação (+) — Práxis
}

const EIXO_MIN = -3;
const EIXO_MAX = 3;

export function criarEixos(s: number, c: number, a: number): EixosTensao {
  const clamp = (n: number) => Math.max(EIXO_MIN, Math.min(EIXO_MAX, Math.round(n)));
  return {
    suorVsSonho: clamp(s),
    conscienciaVsRuido: clamp(c),
    acaoVsInercia: clamp(a),
  };
}
