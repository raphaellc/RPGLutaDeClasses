import { Trabalhador } from '../entities/Trabalhador';
import { comCc, comCm, comTl } from '../value-objects/Recursos';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * UC02 / RF03 — Solidariedade de Classe.
 * Doador transfere 1 CM e o receptor recebe +5 TL. Ambos ganham +2 CC.
 * Pré-condição: doador.cm >= 1 e ambos não colapsados.
 *
 * Devolve { ok: false } se a pré-condição falha — sem lançar exceção.
 */
export type ResultadoSolidariedade =
  | { ok: true; doador: Trabalhador; receptor: Trabalhador; eventos: EventoPartida[] }
  | { ok: false; motivo: string };

const CM_DOADO = 1;
const TL_GANHO = 5;
const CC_GANHO = 2;

export function executarSolidariedade(
  doador: Trabalhador,
  receptor: Trabalhador,
): ResultadoSolidariedade {
  if (doador.id === receptor.id) {
    return { ok: false, motivo: 'Doador e receptor são a mesma pessoa.' };
  }
  if (doador.colapsado || receptor.colapsado) {
    return { ok: false, motivo: 'Personagem colapsado não participa de solidariedade.' };
  }
  if (doador.recursos.cm < CM_DOADO) {
    return { ok: false, motivo: 'Doador na miséria absoluta — sem CM para transferir.' };
  }

  const doadorR = comCc(comCm(doador.recursos, doador.recursos.cm - CM_DOADO, doador.limites), doador.recursos.cc + CC_GANHO);
  const receptorR = comCc(comTl(receptor.recursos, receptor.recursos.tl + TL_GANHO, receptor.limites), receptor.recursos.cc + CC_GANHO);

  return {
    ok: true,
    doador: { ...doador, recursos: doadorR },
    receptor: { ...receptor, recursos: receptorR },
    eventos: [
      {
        tipo: 'solidariedadeExecutada',
        doadorId: doador.id,
        receptorId: receptor.id,
        cmTransferido: CM_DOADO,
        tlGanho: TL_GANHO,
        ccGanho: CC_GANHO,
      },
    ],
  };
}
