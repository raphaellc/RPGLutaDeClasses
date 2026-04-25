import { Trabalhador } from '../entities/Trabalhador';
import { comCm, comTl } from '../value-objects/Recursos';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * UC03 / RF04 — Ciclo Semanal (Assimetria de Classes).
 *
 * Operário Fabril: +10 TL automático, sem custo de CM.
 * Tradutor de Verdades: comporta-se como Fabril (intelectual orgânico tem rotina estruturada).
 * Fantasma da Rede (Uberizado): exige escolha do jogador:
 *    - 'rodar'  : +1 CM, 0 TL  (sobrevivência precária)
 *    - 'folgar' : +5 TL, -2 CM (boletos não perdoam)
 */
export type EscolhaUberizado = 'rodar' | 'folgar';

export function aplicarCicloSemanal(
  t: Trabalhador,
  escolhaUberizado: EscolhaUberizado = 'folgar',
): { trabalhador: Trabalhador; eventos: EventoPartida[] } {
  if (t.colapsado) return { trabalhador: t, eventos: [] };

  if (t.arquetipo === 'ferreiroEngrenagens' || t.arquetipo === 'tradutorVerdades') {
    const novo = { ...t, recursos: comTl(t.recursos, t.recursos.tl + 10, t.limites) };
    return {
      trabalhador: novo,
      eventos: [
        { tipo: 'cicloSemanalAplicado', trabalhadorId: t.id, descricao: 'Descanso semanal: +10 TL.' },
      ],
    };
  }

  // Fantasma da Rede
  if (escolhaUberizado === 'rodar') {
    const novo = { ...t, recursos: comCm(t.recursos, t.recursos.cm + 1, t.limites) };
    return {
      trabalhador: novo,
      eventos: [
        { tipo: 'cicloSemanalAplicado', trabalhadorId: t.id, descricao: 'Continuou rodando: +1 CM, 0 TL.' },
      ],
    };
  }
  // 'folgar'
  let r = comTl(t.recursos, t.recursos.tl + 5, t.limites);
  r = comCm(r, r.cm - 2, t.limites);
  return {
    trabalhador: { ...t, recursos: r },
    eventos: [
      { tipo: 'cicloSemanalAplicado', trabalhadorId: t.id, descricao: 'Tirou folga: +5 TL, -2 CM.' },
    ],
  };
}
