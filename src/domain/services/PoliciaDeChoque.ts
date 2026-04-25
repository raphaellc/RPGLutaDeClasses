import { Trabalhador } from '@domain/entities/Trabalhador';
import { EventoPartida } from '@domain/events/EventosDePartida';

export interface ResultadoPoliciaDeChoque {
  alvo: Trabalhador;
  eventos: EventoPartida[];
}

/**
 * Polícia de Choque — ataque dividido do Estado Burguês (boss final).
 *
 * O Estado age em dois frentes simultâneas:
 *   • Polícia de Choque → danoPV: dano direto ao PV, sem mitigação por CM
 *                          ("a lei não negocia com o corpo")
 *   • Tribunais         → danoCM: destrói Condição Material diretamente
 *                          ("custas judiciais, multas, congelamento de conta")
 *
 * Nem Fetichismo nem CM protegem aqui — é poder de Estado, não extração econômica.
 *
 * Colapso ocorre quando PV chega a 0.
 */
export function aplicarPoliciaDeChoque(
  alvo: Trabalhador,
  antagonistaId: string,
  danoPV: number,
  danoCM: number,
): ResultadoPoliciaDeChoque {
  if (alvo.colapsado) return { alvo, eventos: [] };

  const novoPV = Math.max(0, alvo.recursos.pv - danoPV);
  const novoCM = Math.max(0, alvo.recursos.cm - danoCM);
  const colapsou = novoPV === 0;

  const novoAlvo: Trabalhador = {
    ...alvo,
    recursos: { ...alvo.recursos, pv: novoPV, cm: novoCM },
    colapsado: colapsou,
  };

  const eventos: EventoPartida[] = [
    { tipo: 'policiaDeChoque', antagonistaId, alvoId: alvo.id, danoPV, danoCM },
  ];
  if (colapsou) {
    eventos.push({ tipo: 'colapso', trabalhadorId: alvo.id });
  }

  return { alvo: novoAlvo, eventos };
}
