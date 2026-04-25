import { Trabalhador } from '../entities/Trabalhador';
import { comPv, comTl } from '../value-objects/Recursos';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * UC01 — RF02: Resolução de Dano de Mais-Valia.
 *
 * Regra:
 *   1) dano real = max(0, dano bruto - CM)        (CM atenua, não é consumida)
 *   2) o saldo é subtraído primeiro do TL
 *   3) o que sobrar corrói o PV (exaustão)
 *
 * Função pura. Recebe trabalhador imutável, devolve novo + eventos.
 */
export function aplicarMaisValia(
  alvo: Trabalhador,
  danoBruto: number,
): { alvo: Trabalhador; eventos: EventoPartida[] } {
  if (alvo.colapsado) return { alvo, eventos: [] };

  const danoReal = Math.max(0, danoBruto - alvo.recursos.cm);
  const perdaTl = Math.min(alvo.recursos.tl, danoReal);
  const danoRestante = danoReal - perdaTl;
  const perdaPv = Math.min(alvo.recursos.pv, danoRestante);

  let novoR = comTl(alvo.recursos, alvo.recursos.tl - perdaTl, alvo.limites);
  novoR = comPv(novoR, novoR.pv - perdaPv, alvo.limites);
  const colapsou = novoR.pv <= 0;

  const novoAlvo: Trabalhador = { ...alvo, recursos: novoR, colapsado: colapsou };

  const eventos: EventoPartida[] = [
    {
      tipo: 'maisValiaExtraida',
      alvoId: alvo.id,
      danoBruto,
      danoReal,
      perdaTL: perdaTl,
      perdaPV: perdaPv,
    },
  ];
  if (colapsou && !alvo.colapsado) {
    eventos.push({ tipo: 'colapso', trabalhadorId: alvo.id });
  }
  return { alvo: novoAlvo, eventos };
}
