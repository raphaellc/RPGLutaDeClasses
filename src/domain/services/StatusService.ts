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
  if (alvo.imunidadesPermanentes.includes(tipo)) {
    return {
      alvo,
      eventos: [{
        tipo: 'narrativa',
        texto: `${alvo.nome} ignora a tentativa de ${tipo} — a Escola de Formação dissipou a ilusão antes que ela pegasse.`,
      }],
    };
  }
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

/**
 * Concede imunidade *permanente* a tipos específicos de status (ex.: Escola de
 * Formação imuniza contra Alienação e Fetichismo). Status já ativos do mesmo
 * tipo são curados — a educação dissipa a ilusão presente. Idempotente.
 */
export function concederImunidadePermanente(
  alvo: Trabalhador,
  tipos: ReadonlyArray<StatusNegativo>,
): { alvo: Trabalhador; eventos: EventoPartida[] } {
  if (alvo.colapsado) return { alvo, eventos: [] };

  const eventos: EventoPartida[] = [];
  const tiposNovos = tipos.filter((t) => !alvo.imunidadesPermanentes.includes(t));

  // Cura status ativos dos tipos imunizados.
  const status = alvo.status.filter((s) => {
    if (tipos.includes(s.tipo)) {
      eventos.push({ tipo: 'statusCurado', alvoId: alvo.id, status: s.tipo });
      return false;
    }
    return true;
  });

  return {
    alvo: {
      ...alvo,
      status,
      imunidadesPermanentes: [...alvo.imunidadesPermanentes, ...tiposNovos],
    },
    eventos,
  };
}
