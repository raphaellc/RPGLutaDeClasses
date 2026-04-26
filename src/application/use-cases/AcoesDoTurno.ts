import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { aplicarMaisValia } from '@domain/services/ExtracaoMaisValia';
import { executarSolidariedade } from '@domain/services/Solidariedade';
import { aplicarCicloSemanal, EscolhaUberizado } from '@domain/services/CicloSemanal';
import { contribuirParaOrganizacao } from '@domain/services/EvolucaoOrganizacao';
import { convocarPiquete, convocarGreveGeral, expropriar } from '@domain/services/AcaoColetiva';
import { praxisColetiva } from '@domain/services/Praxis';
import { aplicarStatus, concederImunidade, concederImunidadePermanente, curarStatus, decairStatus } from '@domain/services/StatusService';
import { aplicarResultadoAcao, CustoSucessoComCusto, ParametrosAcaoDireta, Rolagem } from '@domain/services/AcaoDireta';
import { aplicarMaquinasVorazes } from '@domain/services/MaquinasVorazes';
import { aplicarPoliciaDeChoque } from '@domain/services/PoliciaDeChoque';
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
  | { tipo: 'escolaDeFormacao' }
  | { tipo: 'expropriar'; antagonistaId: string }
  | { tipo: 'aplicarStatus'; alvoId: string; status: StatusNegativo; turnos: number }
  | { tipo: 'curarStatus'; alvoId: string; status: StatusNegativo }
  | {
      tipo: 'acaoDireta';
      executorId: string;
      parametros: ParametrosAcaoDireta;
      alvoAntagonistaId?: string;
      rolagem: Rolagem;
      /** Obrigatório se a rolagem deu 'sucessoComCusto'. Ignorado nos demais. */
      custoEscolhido?: CustoSucessoComCusto;
    }
  | { tipo: 'maquinasVorazes'; antagonistaId: string; danoBase: number }
  | { tipo: 'policiaDeChoque'; antagonistaId: string; alvoId: string; danoPV: number; danoCM: number }
  | { tipo: 'ativarTarifaDinamica'; antagonistaId: string; multiplicador: number }
  | { tipo: 'publicarDenuncia'; jornalistaId: string }
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

    case 'acaoDireta': {
      const executor = p.trabalhadores.find((x) => x.id === c.executorId);
      if (!executor) return { partida: p, eventos: [], erro: 'Executor não encontrado.' };
      if (executor.colapsado) return { partida: p, eventos: [], erro: 'Executor colapsado.' };

      const ant = c.alvoAntagonistaId
        ? p.antagonistas.find((a) => a.id === c.alvoAntagonistaId)
        : undefined;
      if (c.alvoAntagonistaId && !ant) {
        return { partida: p, eventos: [], erro: 'Alvo antagonista não encontrado.' };
      }
      if (ant?.derrotado) {
        return { partida: p, eventos: [], erro: 'Antagonista já derrotado.' };
      }

      const res = aplicarResultadoAcao(executor, c.rolagem, c.parametros, c.custoEscolhido);

      let novosAntagonistas = p.antagonistas;
      const eventosExtras: EventoPartida[] = [];
      if (ant && res.danoAoCapital > 0) {
        const novoCapital = Math.max(0, ant.capitalAcumulado - res.danoAoCapital);
        const derrotado = novoCapital === 0;
        novosAntagonistas = p.antagonistas.map((a) =>
          a.id === ant.id ? { ...a, capitalAcumulado: novoCapital, derrotado } : a,
        );
        if (derrotado) {
          eventosExtras.push({ tipo: 'antagonistaDerrotado', antagonistaId: ant.id });
        }
      }

      const eventoAcao: EventoPartida = {
        tipo: 'acaoDiretaResolvida',
        executorId: executor.id,
        intencao: c.parametros.intencao,
        eixo: c.rolagem.eixo,
        d6: c.rolagem.d6,
        bonus: c.rolagem.bonus,
        total: c.rolagem.total,
        resultado: c.rolagem.resultado,
        danoAoCapital: res.danoAoCapital,
        ...(c.alvoAntagonistaId ? { alvoAntagonistaId: c.alvoAntagonistaId } : {}),
      };

      const novaPartida = recalcularFase({
        ...subT(p, res.executor),
        antagonistas: novosAntagonistas,
      });
      return {
        partida: novaPartida,
        eventos: [eventoAcao, ...res.eventos, ...eventosExtras],
      };
    }

    case 'maquinasVorazes': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      if (!ant) return { partida: p, eventos: [], erro: 'Antagonista não encontrado.' };
      if (ant.derrotado) return { partida: p, eventos: [], erro: 'Antagonista já derrotado.' };
      if (ant.bloqueadoNoTurno) {
        return {
          partida: p,
          eventos: [{
            tipo: 'narrativa',
            texto: `${ant.nome} está bloqueado pelo Piquete — as Máquinas Vorazes param por este turno.`,
          }],
        };
      }
      const r = aplicarMaquinasVorazes(p.trabalhadores, c.antagonistaId, c.danoBase);
      return { partida: recalcularFase({ ...p, trabalhadores: r.trabalhadores }), eventos: r.eventos };
    }

    case 'policiaDeChoque': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      const alvo = p.trabalhadores.find((t) => t.id === c.alvoId);
      if (!ant || !alvo) return { partida: p, eventos: [], erro: 'Antagonista ou alvo não encontrado.' };
      if (ant.derrotado) return { partida: p, eventos: [], erro: 'Antagonista já derrotado.' };
      if (ant.bloqueadoNoTurno) {
        return {
          partida: p,
          eventos: [{
            tipo: 'narrativa',
            texto: `${ant.nome} está bloqueado pelo Piquete — a Polícia de Choque recua por este turno.`,
          }],
        };
      }
      const r = aplicarPoliciaDeChoque(alvo, c.antagonistaId, c.danoPV, c.danoCM);
      return { partida: recalcularFase(subT(p, r.alvo)), eventos: r.eventos };
    }

    case 'ativarTarifaDinamica': {
      const ant = p.antagonistas.find((a) => a.id === c.antagonistaId);
      if (!ant) return { partida: p, eventos: [], erro: 'Antagonista não encontrado.' };
      if (ant.derrotado) return { partida: p, eventos: [], erro: 'Antagonista já derrotado.' };
      const novosAnts = p.antagonistas.map((a) =>
        a.id === c.antagonistaId ? { ...a, emTarifaDinamica: true } : a,
      );
      return {
        partida: { ...p, antagonistas: novosAnts },
        eventos: [{
          tipo: 'tarifaDinamicaAtivada',
          antagonistaId: c.antagonistaId,
          multiplicador: c.multiplicador,
        }],
      };
    }

    case 'avancarTurno': {
      // Limpa flags de turno: Piquete e Tarifa Dinâmica
      const desbloqueados = p.antagonistas.map((a) => ({
        ...a,
        bloqueadoNoTurno: false,
        emTarifaDinamica: false,
      }));
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

    case 'publicarDenuncia': {
      const CUSTO_TL = 4;
      const jornalista = p.trabalhadores.find((x) => x.id === c.jornalistaId);
      if (!jornalista) return { partida: p, eventos: [], erro: 'Jornalista não encontrada.' };
      if (jornalista.arquetipo !== 'jornalistaMilitante') {
        return { partida: p, eventos: [], erro: 'Apenas a Jornalista Militante pode publicar denúncias.' };
      }
      if (jornalista.recursos.tl < CUSTO_TL) {
        return { partida: p, eventos: [], erro: `Sem Tempo Livre suficiente para publicar (necessário: ${CUSTO_TL} TL).` };
      }
      const temFetichismo = p.trabalhadores.some((t) => !t.colapsado && t.status.some((s) => s.tipo === 'fetichismo'));
      if (!temFetichismo) {
        return { partida: p, eventos: [{ tipo: 'narrativa', texto: 'Denúncia publicada — nenhum Fetichismo ativo a curar.' }] };
      }
      const eventos: EventoPartida[] = [{
        tipo: 'narrativa',
        texto: 'DENÚNCIA PUBLICADA! A reportagem de base expõe o Fetichismo — toda a classe se liberta da ilusão.',
      }];
      const novaJornalista: Trabalhador = { ...jornalista, recursos: { ...jornalista.recursos, tl: jornalista.recursos.tl - CUSTO_TL } };
      const trabalhadores = p.trabalhadores.map((t) => {
        if (t.colapsado) return t;
        const hasFetichismo = t.status.some((s) => s.tipo === 'fetichismo');
        if (!hasFetichismo) return t.id === jornalista.id ? novaJornalista : t;
        const r = curarStatus(t.id === jornalista.id ? novaJornalista : t, 'fetichismo');
        eventos.push(...r.eventos);
        return r.alvo;
      });
      return { partida: { ...p, trabalhadores }, eventos };
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
          texto: `MANIFESTAÇÃO DE MASSAS! Por ${TURNOS_IMUNIDADE} turnos a classe está blindada contra qualquer status negativo.`,
        }],
      };
    }

    case 'escolaDeFormacao': {
      const CUSTO_ESCOLA_TL = 15;
      const CUSTO_ESCOLA_CM = 5;
      const TIPOS_IMUNIZADOS = ['alienacao', 'fetichismo'] as const;
      if (p.organizacao.nivel < 3) {
        return { partida: p, eventos: [], erro: 'Organização precisa estar no Nível 3 para fundar a Escola de Formação.' };
      }
      if (p.organizacao.fundoDeGreve.tl < CUSTO_ESCOLA_TL || p.organizacao.fundoDeGreve.cm < CUSTO_ESCOLA_CM) {
        return { partida: p, eventos: [], erro: 'Fundo de Greve insuficiente — sem recursos para formação.' };
      }
      // Idempotência: se TODOS os trabalhadores já são imunes a TODOS os tipos,
      // não cobra recursos e devolve narrativa explicativa.
      const todosJaImunes = p.trabalhadores.every((t) =>
        TIPOS_IMUNIZADOS.every((tipo) => t.imunidadesPermanentes.includes(tipo)),
      );
      if (todosJaImunes) {
        return {
          partida: p,
          eventos: [{ tipo: 'narrativa', texto: 'A Escola de Formação já consolidou a consciência da classe — sem novos imunizados.' }],
        };
      }
      const eventos: EventoPartida[] = [];
      const trabalhadores = p.trabalhadores.map((t) => {
        const r = concederImunidadePermanente(t, TIPOS_IMUNIZADOS);
        eventos.push(...r.eventos);
        return r.alvo;
      });
      const novaOrg = {
        ...p.organizacao,
        fundoDeGreve: {
          tl: p.organizacao.fundoDeGreve.tl - CUSTO_ESCOLA_TL,
          cm: p.organizacao.fundoDeGreve.cm - CUSTO_ESCOLA_CM,
        },
      };
      eventos.unshift({
        tipo: 'narrativa',
        texto: `ESCOLA DE FORMAÇÃO fundada — a classe assimila Marx, Lênin e Rosa. Imunidade permanente a Alienação e Fetichismo.`,
      });
      return {
        partida: { ...p, organizacao: novaOrg, trabalhadores },
        eventos,
      };
    }
  }
}
