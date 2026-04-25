import { Trabalhador } from '../entities/Trabalhador';
import { StatusAtivo, StatusNegativo } from '../value-objects/Status';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * Aplicação e cura de status (Alienação, Fetichismo). RF08.
 * Tradutor de Verdades pode curar via "Desmistificação" (use case dedicado).
 */
export function aplicarStatus(
  alvo: Trabalhador,
  tipo: StatusNegativo,
  turnos: number,
): { alvo: Trabalhador; eventos: EventoPartida[] } {
  if (alvo.colapsado) return { alvo, eventos: [] };
  const existe = alvo.status.find((s) => s.tipo === tipo);
  const novosStatus: StatusAtivo[] = existe
    ? alvo.status.map((s) => (s.tipo === tipo ? { tipo, turnosRestantes: Math.max(s.turnosRestantes, turnos) } : s))
    : [...alvo.status, { tipo, turnosRestantes: turnos }];
  return {
    alvo: { ...alvo, status: novosStatus },
    eventos: [{ tipo: 'statusAplicado', alvoId: alvo.id, status: tipo, turnos }],
  };
}

export function curarStatus(
  alvo: Trabalhador,
  tipo: StatusNegativo,
): { alvo: Trabalhador; eventos: EventoPartida[] } {
  if (!alvo.status.some((s) => s.tipo === tipo)) return { alvo, eventos: [] };
  return {
    alvo: { ...alvo, status: alvo.status.filter((s) => s.tipo !== tipo) },
    eventos: [{ tipo: 'statusCurado', alvoId: alvo.id, status: tipo }],
  };
}

/** Reduz o contador de todos os status em 1 turno; remove os que chegam a zero. */
export function decairStatus(alvo: Trabalhador): Trabalhador {
  return {
    ...alvo,
    status: alvo.status
      .map((s) => ({ ...s, turnosRestantes: s.turnosRestantes - 1 }))
      .filter((s) => s.turnosRestantes > 0),
  };
}
