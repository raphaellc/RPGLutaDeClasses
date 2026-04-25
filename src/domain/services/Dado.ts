/**
 * Porta para geração aleatória — definida no domínio para permitir injeção
 * (RNG real em produção, RNG determinístico em testes).
 */
export interface Dado {
  d6(): number;
}

export type ResultadoRolagem = 'sucessoPleno' | 'sucessoComCusto' | 'derrota';

export function classificarRolagem(valor: number): ResultadoRolagem {
  if (valor >= 5) return 'sucessoPleno';
  if (valor >= 3) return 'sucessoComCusto';
  return 'derrota';
}
