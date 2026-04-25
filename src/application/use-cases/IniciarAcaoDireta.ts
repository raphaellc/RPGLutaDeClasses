import { Trabalhador } from '@domain/entities/Trabalhador';
import { Dado } from '@domain/services/Dado';
import {
  bonusEixo,
  classificarTotal,
  EixoNome,
  Rolagem,
} from '@domain/services/AcaoDireta';

/**
 * Caso de uso de fronteira: usa o `Dado` (porta) para gerar uma rolagem
 * pronta para ser passada como parte do comando `acaoDireta`. Mantém o
 * domínio determinístico — toda a aleatoriedade vive aqui.
 */
export function rolarAcaoDireta(executor: Trabalhador, eixo: EixoNome, dado: Dado): Rolagem {
  const d6 = dado.d6();
  const bonus = bonusEixo(executor, eixo);
  const total = d6 + bonus;
  return {
    d6,
    bonus,
    total,
    resultado: classificarTotal(total),
    eixo,
  };
}
