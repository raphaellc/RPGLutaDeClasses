/**
 * Funções puras que convertem EventoPartida em texto legível e classe CSS.
 * Compartilhadas por LogNarrativo e RelatorioCapital.
 */
import { EventoPartida } from '@domain/events/EventosDePartida';

export function textoEvento(e: EventoPartida): string {
  switch (e.tipo) {
    case 'maisValiaExtraida':
      return `O Capital extraiu mais-valia. Dano bruto ${e.danoBruto}, real ${e.danoReal} (–${e.perdaTL} TL, –${e.perdaPV} PV).`;
    case 'solidariedadeExecutada':
      return `Solidariedade de Classe: ${e.cmTransferido} CM → ${e.tlGanho} TL. Ambos +${e.ccGanho} CC.`;
    case 'cicloSemanalAplicado':
      return `Ciclo semanal: ${e.descricao}`;
    case 'organizacaoEvoluiu':
      return `★ A Organização EVOLUIU para nível ${e.nivelNovo}! Habilidades: ${e.habilidadesDesbloqueadas.join(', ')}.`;
    case 'piqueteConvocado':
      return `PIQUETE convocado: dano ${e.danoCapital} ao Capital, custo ${e.custoCm} CM do Fundo.`;
    case 'greveGeralConvocada':
      return `★ GREVE GERAL: dano ${e.danoCapital}. Fundo perdeu ${e.custoCm} CM e ${e.custoTl} TL.`;
    case 'expropriacao':
      return `EXPROPRIAÇÃO: os meios de produção foram tomados.`;
    case 'statusAplicado':
      return `Status aplicado: ${e.status} por ${e.turnos} turnos.`;
    case 'statusCurado':
      return `Status curado: ${e.status}.`;
    case 'colapso':
      return `Trabalhador COLAPSOU por exaustão.`;
    case 'antagonistaDerrotado':
      return `Antagonista derrotado.`;
    case 'rolagem':
      return `Rolagem: ${e.valor} (${e.resultado}).`;
    case 'acaoDiretaResolvida':
      return `Ação Direta — "${e.intencao}" via ${e.eixo}: ${e.d6}+${e.bonus}=${e.total} (${e.resultado})${e.danoAoCapital ? ` · ${e.danoAoCapital} de dano ao Capital` : ''}.`;
    case 'maquinasVorazes':
      return `MÁQUINAS VORAZES: –${e.danoBase} PV a cada trabalhador (${e.alvosAfetados.length} afetados).`;
    case 'policiaDeChoque':
      return `POLÍCIA DE CHOQUE: –${e.danoPV} PV (força bruta) · –${e.danoCM} CM (Tribunais).`;
    case 'tarifaDinamicaAtivada':
      return `⚡ TARIFA DINÂMICA: Algoritmo em Modo Pico — dano ×${e.multiplicador} neste turno.`;
    case 'narrativa':
      return e.texto;
  }
}

export function classeEvento(e: EventoPartida): string {
  switch (e.tipo) {
    case 'narrativa':
      if (/^(MANIFESTA|ESCOLA|EXPROPRIA|GREVE GERAL)/.test(e.texto)) return 'evolucao';
      return 'narrativa';
    case 'organizacaoEvoluiu':   return 'evolucao';
    case 'maquinasVorazes':      return 'vermelho';
    case 'policiaDeChoque':      return 'vermelho';
    case 'tarifaDinamicaAtivada': return 'vermelho';
    case 'colapso':              return 'vermelho';
    default:                     return 'evento';
  }
}
