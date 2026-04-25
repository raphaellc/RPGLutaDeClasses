import { Trabalhador } from '../entities/Trabalhador';
import { StatusAtivo, StatusNegativo } from '../value-objects/Status';
import { EventoPartida } from '../events/EventosDePartida';

/**
 * Aplicação e cura de status (Alienação, Fetichismo). RF08.
 * Tradutor de Verdades pode curar via "Desmistificação" (use case dedicado).
 * Trabalhadores sob imunidade (ex.: cobertos por Manifestação de Massas / Escola
 * de Formação) ignoram a aplicação — emite evento narrativo de proteção.
 */
export function aplicarStatus(
  alvo: Trabalhador,
  tipo: StatusNegativo,
  turnos: number,
): { alvo: Trabalhador; eventos: EventoPartida[] } {
  if (alvo.colapsado) return { alvo, eventos: [] };
  if (alvo.imunidadeStatusTurnos > 0) {
    return {
      alvo,
      eventos: [{
        tipo: 'narrativa',
        texto: `${alvo.nome} resistiu à tentativa de ${tipo} — a Organização escudou a classe.`,
      }],
    };
  }
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

/** Reduz o contador de status e de imunidade em 1 turno; remove status zerados. */
export function decairStatus(alvo: Trabalhador): { alvo: Trabalhador; eventos: EventoPartida[] } {
  const eventos: EventoPartida[] = [];
  const status = alvo.status
    .map((s) => ({ ...s, turnosRestantes: s.turnosRestantes - 1 }))
    .filter((s) => {
      if (s.turnosRestantes > 0) return true;
      eventos.push({ tipo: 'statusCurado', alvoId: alvo.id, status: s.tipo });
      return false;
    });
  const imunidade = Math.max(0, alvo.imunidadeStatusTurnos - 1);
  return {
    alvo: { ...alvo, status, imunidadeStatusTurnos: imunidade },
    eventos,
  };
}

/** Concede imunidade a novos status pelos próximos N turnos. */
export function concederImunidade(alvo: Trabalhador, turnos: number): Trabalhador {
  if (alvo.colapsado) return alvo;
  return {
    ...alvo,
    imunidadeStatusTurnos: Math.max(alvo.imunidadeStatusTurnos, Math.max(0, turnos)),
  };
}
