import { Partida } from '@domain/entities/Partida';
import { Comando } from '../use-cases/AcoesDoTurno';

/**
 * Heurística para o modo simulado: trabalhadores agem solidária e estrategicamente.
 *
 * Prioridades, em ordem:
 *   0) Desmistificar (Tradutor) se algum aliado está sob status negativo.
 *   1) Curar quem está em risco (PV<20 ou TL=0 e CM=0): solidariedade.
 *   2) Convocar Greve Geral se possível.
 *   3) Convocar Manifestação de Massas se a Organização atingiu Nível 3 e
 *      ninguém ainda tem imunidade — escudo defensivo coletivo.
 *   4) Convocar Piquete se possível.
 *   5) Contribuir para Organização (despejar TL, CM e CC no Fundo).
 *   6) Ciclo semanal a cada 4 turnos.
 *   7) Expropriação se Nível 4.
 */
export function planejarTurnoTrabalhadores(p: Partida): Comando[] {
  const comandos: Comando[] = [];
  const ativos = p.trabalhadores.filter((t) => !t.colapsado);
  if (ativos.length === 0) return comandos;

  // 0) Desmistificar — Tradutor de Verdades cura status negativos.
  const tradutor = ativos.find((t) => t.arquetipo === 'tradutorVerdades' && t.recursos.tl >= 3);
  if (tradutor) {
    const aliadoComStatus = ativos.find((t) => t.id !== tradutor.id && t.status.length > 0);
    if (aliadoComStatus) {
      comandos.push({ tipo: 'curarStatus', alvoId: aliadoComStatus.id, status: aliadoComStatus.status[0]!.tipo });
    }
  }

  // 1) Solidariedade — o mais saudável (maior CM) ajuda o mais frágil (menor PV).
  // Doador alienado não pode doar (regra do domínio).
  const emRisco = ativos.find((t) => t.recursos.pv < 25 || (t.recursos.tl === 0 && t.recursos.cm <= 1));
  if (emRisco) {
    const doador = ativos
      .filter((t) => t.id !== emRisco.id && t.recursos.cm >= 1 && !t.status.some((s) => s.tipo === 'alienacao'))
      .sort((a, b) => b.recursos.cm - a.recursos.cm)[0];
    if (doador) {
      comandos.push({ tipo: 'solidariedade', doadorId: doador.id, receptorId: emRisco.id });
    }
  }

  // 2) Greve Geral
  const alvoGG = p.antagonistas.find((a) => !a.derrotado && a.capitalAcumulado > 30);
  if (alvoGG && p.organizacao.nivel >= 3 && p.organizacao.fundoDeGreve.cm >= 15 && p.organizacao.fundoDeGreve.tl >= 20) {
    comandos.push({ tipo: 'greveGeral', antagonistaId: alvoGG.id });
    return comandos;
  }

  // 3) Manifestação de Massas — escudo defensivo se Nível 3 e classe vulnerável.
  const todosSemImunidade = ativos.every((t) => t.imunidadeStatusTurnos === 0);
  const algumComStatus = ativos.some((t) => t.status.length > 0);
  if (
    p.organizacao.nivel >= 3 &&
    p.organizacao.fundoDeGreve.tl >= 10 &&
    todosSemImunidade &&
    algumComStatus
  ) {
    comandos.push({ tipo: 'manifestacaoDeMassas' });
  }

  // 4) Piquete
  const alvoP = p.antagonistas.find((a) => !a.derrotado);
  if (alvoP && p.organizacao.nivel >= 2 && p.organizacao.fundoDeGreve.cm >= 5) {
    comandos.push({ tipo: 'piquete', antagonistaId: alvoP.id });
  }

  // 4) Contribuir para a Organização — quem tem TL sobrando doa
  for (const t of ativos) {
    const tlExcedente = t.recursos.tl > 8 ? Math.min(3, t.recursos.tl - 8) : 0;
    const cmExcedente = t.recursos.cm > 3 ? 1 : 0;
    if (tlExcedente > 0 || cmExcedente > 0) {
      comandos.push({
        tipo: 'contribuirOrganizacao',
        trabalhadorId: t.id,
        cm: cmExcedente,
        tl: tlExcedente,
        cc: t.recursos.cc, // converte CC individual em coletiva
      });
    }
  }

  // 5) Ciclo semanal a cada 4 turnos
  if (p.turno % 4 === 0) {
    for (const t of ativos) {
      comandos.push({ tipo: 'cicloSemanal', trabalhadorId: t.id, escolha: 'folgar' });
    }
  }

  // 6) Expropriação se possível
  if (p.organizacao.nivel >= 4) {
    const alvoFinal = p.antagonistas.find((a) => !a.derrotado);
    if (alvoFinal) comandos.push({ tipo: 'expropriar', antagonistaId: alvoFinal.id });
  }

  // Garante pelo menos 1 ação se nada saiu
  if (comandos.length === 0 && ativos.length >= 2) {
    const [a, b] = ativos;
    if (a.recursos.cm >= 1) {
      comandos.push({ tipo: 'solidariedade', doadorId: a.id, receptorId: b.id });
    }
  }

  return comandos;
}
