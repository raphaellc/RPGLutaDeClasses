import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { aplicarMaisValia } from '@domain/services/ExtracaoMaisValia';
import { executarSolidariedade } from '@domain/services/Solidariedade';
import { aplicarCicloSemanal, EscolhaUberizado } from '@domain/services/CicloSemanal';
import { contribuirParaOrganizacao } from '@domain/services/EvolucaoOrganizacao';
import { convocarPiquete, convocarGreveGeral, expropriar } from '@domain/services/AcaoColetiva';
import { praxisColetiva } from '@domain/services/Praxis';
import { aplicarStatus, concederImunidade, curarStatus, decairStatus } from '@domain/services/StatusService';
import { StatusNegativo } from '@domain/value-objects/Status';
import { EventoPartida } from '@domain/events/EventosDePartida';

/**
 * Comandos que a UI (ou o motor de simulação) emite contra a Partida.
 * Cada comando é uma intenção pura — sem efeitos colaterais.
 */
export type Comando =
  | { tipo: 'extrairMaisValia'; antagonistaId: string; alvoId: string; danoBruto: number }
  | { tipo: 'solidariedade'; doadorId: string; receptorId: string }
  | { tipo: 'cicloSemanal'; trabalhadorId: string; escolha?: EscolhaUberizado }
  | { tipo: 'contribuirOrganizacao'; trabalhadorId: string; cm: number; tl: number; cc: number }
  | { tipo: 'piquete'; antagonistaId: string }
  | { tipo: 'greveGeral'; antagonistaId: string }
  | { tipo: 'manifestacaoDeMassas' }
  | { tipo: 'expropriar'; antagonistaId: string }
  | { tipo: 'aplicarStatus'; alvoId: string; status: StatusNegativo; turnos: number }
  | { tipo: 'curarStatus'; alvoId: string; status: StatusNegativo }
  | { tipo: 'avancarTurno' };

export interface ResultadoComando {
  partida: Partida;
  eventos: ReadonlyArray<EventoPartida>;
  erro?: string;
}

const subT = (p: Partida, novo: Trabalhador): Partida => ({
  ...p,
  trabalhadores: p.trabalhadores.map((t) => (t.id === novo.id ? novo : t)),
});

function recalcularFase(p: Partida): Partida {
  const todosColapsados = p.trabalhadores.every((t) => t.colapsado);
  const todosDerrotados = p.antagonistas.every((a) => a.derrotado);
  if (todosDerrotados) return { ...p, fase: 'vitoriaProletaria' };
  if (todosColapsados) return { ...p, fase: 'derrotaDoGrupo' };
  return p;
}

export function aplicarComando(p: Partida, c: Comando): ResultadoComando {
  if (p.fase !== 'emAndamento') {
    return { partida: p, eventos: [], erro: 'Partida encerrada.' };
  }

  switch (c.tipo) {
    case 'extrairMaisValia': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      const alvo = p.trabalhadores.find((t) => t.id === c.alvoId);
      if (!ant || !alvo) return { partida: p, eventos: [], erro: 'Antagonista ou alvo não encontrado.' };
      if (ant.derrotado) return { partida: p, eventos: [], erro: 'Antagonista já derrotado.' };
      if (ant.bloqueadoNoTurno) {
        return { partida: p, eventos: [{ tipo: 'narrativa', texto: `${ant.nome} foi bloqueado pelo Piquete e não pôde extrair mais-valia.` }] };
      }
      const r = aplicarMaisValia(alvo, c.danoBruto);
      return { partida: recalcularFase(subT(p, r.alvo)), eventos: r.eventos };
    }

    case 'solidariedade': {
      const d = p.trabalhadores.find((t) => t.id === c.doadorId);
      const r = p.trabalhadores.find((t) => t.id === c.receptorId);
      if (!d || !r) return { partida: p, eventos: [], erro: 'Doador ou receptor não encontrado.' };
      const res = executarSolidariedade(d, r);
      if (!res.ok) return { partida: p, eventos: [], erro: res.motivo };
      return { partida: subT(subT(p, res.doador), res.receptor), eventos: res.eventos };
    }

    case 'cicloSemanal': {
      const t = p.trabalhadores.find((x) => x.id === c.trabalhadorId);
      if (!t) return { partida: p, eventos: [], erro: 'Trabalhador não encontrado.' };
      const r = aplicarCicloSemanal(t, c.escolha);
      return { partida: subT(p, r.trabalhador), eventos: r.eventos };
    }

    case 'contribuirOrganizacao': {
      const t = p.trabalhadores.find((x) => x.id === c.trabalhadorId);
      if (!t) return { partida: p, eventos: [], erro: 'Trabalhador não encontrado.' };
      // Deduz dos recursos individuais
      const cmDoado = Math.min(c.cm, t.recursos.cm);
      const tlDoado = Math.min(c.tl, t.recursos.tl);
      const ccDoado = Math.min(c.cc, t.recursos.cc);
      const novoT: Trabalhador = {
        ...t,
        recursos: {
          ...t.recursos,
          cm: t.recursos.cm - cmDoado,
          tl: t.recursos.tl - tlDoado,
          cc: t.recursos.cc - ccDoado,
        },
      };
      const res = contribuirParaOrganizacao(p.organizacao, { cm: cmDoado, tl: tlDoado, cc: ccDoado });
      return {
        partida: { ...subT(p, novoT), organizacao: res.organizacao },
        eventos: res.eventos,
      };
    }

    case 'piquete': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      if (!ant) return { partida: p, eventos: [], erro: 'Antagonista não encontrado.' };
      const res = convocarPiquete(p.organizacao, ant, praxisColetiva(p.trabalhadores));
      if (!res.ok) return { partida: p, eventos: [], erro: res.motivo };
      const novaPartida = recalcularFase({
        ...p,
        organizacao: res.organizacao,
        antagonistas: p.antagonistas.map((a) => (a.id === ant.id ? res.antagonista : a)),
      });
      return { partida: novaPartida, eventos: res.eventos };
    }

    case 'greveGeral': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      if (!ant) return { partida: p, eventos: [], erro: 'Antagonista não encontrado.' };
      const res = convocarGreveGeral(p.organizacao, ant, praxisColetiva(p.trabalhadores));
      if (!res.ok) return { partida: p, eventos: [], erro: res.motivo };
      const novaPartida = recalcularFase({
        ...p,
        organizacao: res.organizacao,
        antagonistas: p.antagonistas.map((a) => (a.id === ant.id ? res.antagonista : a)),
      });
      return { partida: novaPartida, eventos: res.eventos };
    }

    case 'expropriar': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      if (!ant) return { partida: p, eventos: [], erro: 'Antagonista não encontrado.' };
      const res = expropriar(p.organizacao, ant);
      if (!res.ok) return { partida: p, eventos: [], erro: res.motivo };
      const novaPartida = recalcularFase({
        ...p,
        organizacao: res.organizacao,
        antagonistas: p.antagonistas.map((a) => (a.id === ant.id ? res.antagonista : a)),
      });
      return { partida: novaPartida, eventos: res.eventos };
    }

    case 'aplicarStatus': {
      const t = p.trabalhadores.find((x) => x.id === c.alvoId);
      if (!t) return { partida: p, eventos: [], erro: 'Alvo não encontrado.' };
      const r = aplicarStatus(t, c.status, c.turnos);
      return { partida: subT(p, r.alvo), eventos: r.eventos };
    }

    case 'curarStatus': {
      const t = p.trabalhadores.find((x) => x.id === c.alvoId);
      if (!t) return { partida: p, eventos: [], erro: 'Alvo não encontrado.' };
      const r = curarStatus(t, c.status);
      return { partida: subT(p, r.alvo), eventos: r.eventos };
    }

    case 'avancarTurno': {
      const desbloqueados = p.antagonistas.map((a) => ({ ...a, bloqueadoNoTurno: false }));
      const proxAtivo = p.turnoAtivoDe === 'jogadores' ? 'sistema' : 'jogadores';
      const proxTurno = proxAtivo === 'jogadores' ? p.turno + 1 : p.turno;
      // Decai status apenas quando o ciclo completo termina (volta para jogadores).
      const eventos: EventoPartida[] = [];
      let trabalhadores = p.trabalhadores;
      if (proxAtivo === 'jogadores') {
        trabalhadores = trabalhadores.map((t) => {
          const r = decairStatus(t);
          eventos.push(...r.eventos);
          return r.alvo;
        });
      }
      eventos.push({
        tipo: 'narrativa',
        texto: `Turno ${proxTurno} — vez de ${proxAtivo === 'jogadores' ? 'os trabalhadores' : 'a Voz do Sistema'}.`,
      });
      return {
        partida: { ...p, antagonistas: desbloqueados, trabalhadores, turnoAtivoDe: proxAtivo, turno: proxTurno },
        eventos,
      };
    }

    case 'manifestacaoDeMassas': {
      const CUSTO_MANIFESTACAO_TL = 10;
      const TURNOS_IMUNIDADE = 2;
      if (p.organizacao.nivel < 3) {
        return { partida: p, eventos: [], erro: 'Organização precisa estar no Nível 3 para Manifestação.' };
      }
      if (p.organizacao.fundoDeGreve.tl < CUSTO_MANIFESTACAO_TL) {
        return { partida: p, eventos: [], erro: 'Fundo de Greve sem TL suficiente para mobilização.' };
      }
      const novaOrg = {
        ...p.organizacao,
        fundoDeGreve: { ...p.organizacao.fundoDeGreve, tl: p.organizacao.fundoDeGreve.tl - CUSTO_MANIFESTACAO_TL },
      };
      const trabalhadores = p.trabalhadores.map((t) => concederImunidade(t, TURNOS_IMUNIDADE));
      return {
        partida: { ...p, organizacao: novaOrg, trabalhadores },
        eventos: [{
          tipo: 'narrativa',
          texto: `MANIFESTAÇÃO DE MASSAS! Por ${TURNOS_IMUNIDADE} turnos a classe está blindada contra Alienação e Fetichismo.`,
        }],
      };
    }
  }
}
