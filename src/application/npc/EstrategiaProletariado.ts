import { Partida } from '@domain/entities/Partida';
import { Trabalhador } from '@domain/entities/Trabalhador';
import { Dado } from '@domain/services/Dado';
import { bonusEixo, CustoSucessoComCusto, EixoNome } from '@domain/services/AcaoDireta';
import { rolarAcaoDireta } from '../use-cases/IniciarAcaoDireta';
import { Comando } from '../use-cases/AcoesDoTurno';

/**
 * Heurística para o modo simulado: trabalhadores agem solidária e estrategicamente.
 *
 * Prioridades, em ordem:
 *   0) Desmistificar (Tradutor) se algum aliado está sob status negativo.
 *   1) Curar quem está em risco (PV<25 ou TL=0 e CM=0): solidariedade.
 *   2) Convocar Greve Geral se possível.
 *   3a) Escola de Formação — investimento permanente se ainda não fundada.
 *   3b) Manifestação de Massas — escudo temporário se vulnerável a status.
 *   4) Piquete.
 *   5) Ação Direta (1d6) — ofensiva individual; um trabalhador por turno.
 *   6) Contribuir para a Organização.
 *   7) Ciclo semanal a cada 4 turnos.
 *   8) Expropriação se Nível 4.
 *
 * @param dado  Porta de aleatoriedade — injetada pelo caller (DadoCriptografico
 *              em produção, DadoDeterministico em testes).
 */
export function planejarTurnoTrabalhadores(p: Partida, dado: Dado): Comando[] {
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

  // 1) Solidariedade — o mais saudável ajuda o mais frágil.
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

  // 3a) Escola de Formação — investimento permanente. Prioritária se ainda não foi fundada.
  const algumSemImunidadePermanente = ativos.some(
    (t) => !t.imunidadesPermanentes.includes('alienacao') || !t.imunidadesPermanentes.includes('fetichismo'),
  );
  if (
    p.organizacao.nivel >= 3 &&
    p.organizacao.fundoDeGreve.tl >= 15 &&
    p.organizacao.fundoDeGreve.cm >= 5 &&
    algumSemImunidadePermanente
  ) {
    comandos.push({ tipo: 'escolaDeFormacao' });
  }

  // 3b) Manifestação de Massas — escudo temporário.
  const todosSemImunidadeTemp = ativos.every((t) => t.imunidadeStatusTurnos === 0);
  const algumComStatus = ativos.some((t) => t.status.length > 0);
  if (
    p.organizacao.nivel >= 3 &&
    p.organizacao.fundoDeGreve.tl >= 10 &&
    todosSemImunidadeTemp &&
    algumComStatus &&
    algumSemImunidadePermanente
  ) {
    comandos.push({ tipo: 'manifestacaoDeMassas' });
  }

  // 4) Piquete
  const alvoP = p.antagonistas.find((a) => !a.derrotado);
  if (alvoP && p.organizacao.nivel >= 2 && p.organizacao.fundoDeGreve.cm >= 5) {
    comandos.push({ tipo: 'piquete', antagonistaId: alvoP.id });
  }

  // 5) Ação Direta (1d6) — ofensiva individual.
  // O trabalhador com melhor eixo (que tenha PV suficiente) ataca o antagonista
  // mais capitalizado (a ameaça mais urgente).
  const alvoAD = p.antagonistas.find((a) => !a.derrotado);
  const executorAD = escolherExecutorAcaoDireta(ativos);
  if (alvoAD && executorAD) {
    const eixo = melhorEixo(executorAD);
    const danoSeSucesso = Math.max(5, Math.ceil(alvoAD.capitalAcumulado * 0.15));
    const rolagem = rolarAcaoDireta(executorAD, eixo, dado);
    const custo = escolherCusto(executorAD);

    comandos.push({
      tipo: 'acaoDireta',
      executorId: executorAD.id,
      parametros: {
        intencao: intencaoPorArquetipo(executorAD, eixo),
        eixo,
        danoAoCapitalSeSucesso: danoSeSucesso,
      },
      alvoAntagonistaId: alvoAD.id,
      rolagem,
      custoEscolhido: custo,
    });
  }

  // 6) Contribuir para a Organização — quem tem excedente doa
  for (const t of ativos) {
    const tlExcedente = t.recursos.tl > 8 ? Math.min(3, t.recursos.tl - 8) : 0;
    const cmExcedente = t.recursos.cm > 3 ? 1 : 0;
    if (tlExcedente > 0 || cmExcedente > 0) {
      comandos.push({
        tipo: 'contribuirOrganizacao',
        trabalhadorId: t.id,
        cm: cmExcedente,
        tl: tlExcedente,
        cc: t.recursos.cc,
      });
    }
  }

  // 7) Ciclo semanal a cada 4 turnos
  if (p.turno % 4 === 0) {
    for (const t of ativos) {
      comandos.push({ tipo: 'cicloSemanal', trabalhadorId: t.id, escolha: 'folgar' });
    }
  }

  // 8) Expropriação se Nível 4
  if (p.organizacao.nivel >= 4) {
    const alvoFinal = p.antagonistas.find((a) => !a.derrotado);
    if (alvoFinal) comandos.push({ tipo: 'expropriar', antagonistaId: alvoFinal.id });
  }

  // Fallback: solidariedade mínima se nada foi planejado
  if (comandos.length === 0 && ativos.length >= 2) {
    const [a, b] = ativos;
    if (a!.recursos.cm >= 1 && !a!.status.some((s) => s.tipo === 'alienacao')) {
      comandos.push({ tipo: 'solidariedade', doadorId: a!.id, receptorId: b!.id });
    }
  }

  return comandos;
}

// ── Helpers privados ──────────────────────────────────────────────────────────

/**
 * Escolhe o trabalhador com o maior eixo somado (melhor para Ação Direta),
 * excluindo quem está com PV baixo demais (risco de colapso em derrota poética).
 */
function escolherExecutorAcaoDireta(ativos: ReadonlyArray<Trabalhador>): Trabalhador | undefined {
  return [...ativos]
    .filter((t) => t.recursos.pv > 5) // margem mínima para absorver derrota (–3 PV)
    .sort((a, b) => totalEixos(b) - totalEixos(a))[0];
}

function totalEixos(t: Trabalhador): number {
  return t.eixos.suorVsSonho + t.eixos.conscienciaVsRuido + t.eixos.acaoVsInercia;
}

/**
 * Retorna o eixo com maior bônus para o trabalhador. Em caso de empate,
 * prefere `acaoVsInercia` (mais frequente na narrativa de simulação).
 */
function melhorEixo(t: Trabalhador): EixoNome {
  const eixos: EixoNome[] = ['suorVsSonho', 'conscienciaVsRuido', 'acaoVsInercia'];
  return eixos.reduce((melhor, e) => (bonusEixo(t, e) >= bonusEixo(t, melhor) ? e : melhor));
}

/**
 * Custo mais seguro para o executor dado seu estado atual.
 * Prefere `pv` se tem sobra, `cm` se tem, ou `alienacao` como último recurso
 * (só se não for imune permanentemente — nesse caso volta para `pv`).
 */
function escolherCusto(t: Trabalhador): CustoSucessoComCusto {
  const jaAliena = t.status.some((s) => s.tipo === 'alienacao');
  const imunePermanente = t.imunidadesPermanentes.includes('alienacao');
  if (t.recursos.pv > 10) return 'pv';
  if (t.recursos.cm >= 2) return 'cm';
  if (!jaAliena && !imunePermanente) return 'alienacao';
  return 'pv'; // último recurso: aceita o dano físico
}

/**
 * Texto narrativo da intenção baseado no arquétipo e eixo.
 * Dá sabor ao log sem alterar mecânicas.
 */
function intencaoPorArquetipo(t: Trabalhador, eixo: EixoNome): string {
  const acoes: Record<string, Record<EixoNome, string>> = {
    ferreiroEngrenagens: {
      suorVsSonho: 'sabota a linha de produção',
      conscienciaVsRuido: 'organiza os colegas de turno',
      acaoVsInercia: 'para a máquina com o próprio corpo',
    },
    fantasmaRede: {
      suorVsSonho: 'vaza dados salariais internos',
      conscienciaVsRuido: 'hackeia os sistemas de vigilância',
      acaoVsInercia: 'distribui panfletos na plataforma',
    },
    tradutorVerdades: {
      suorVsSonho: 'desmonta a narrativa midiática',
      conscienciaVsRuido: 'publica análise de classe nas redes',
      acaoVsInercia: 'convoca assembleia de emergência',
    },
  };
  return acoes[t.arquetipo]?.[eixo] ?? 'age contra o Capital';
}
