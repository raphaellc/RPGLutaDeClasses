import { useEffect, useRef } from 'react';
import { EventoPartida } from '@domain/events/EventosDePartida';
import { EntradaLog } from '../hooks/useEstadoPartida';

export function LogNarrativo({ entradas }: { entradas: ReadonlyArray<EntradaLog> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entradas]);
  return (
    <div className="log" ref={ref}>
      {entradas.length === 0 && (
        <p style={{ color: 'var(--branco-manifesto-2)', fontStyle: 'italic' }}>
          O silêncio da Metrópole-Máquina pesa. Aguardando primeira ação.
        </p>
      )}
      {entradas.map((e) => (
        <div key={e.id} className={`entrada ${classe(e.evento)}`}>
          <span style={{ color: 'var(--ouro-operario)' }}>[T{e.turno}]</span> {textoEvento(e.evento)}
        </div>
      ))}
    </div>
  );
}

function classe(e: EventoPartida): string {
  switch (e.tipo) {
    case 'narrativa':
      // Narrativas-marco (MANIFESTAÇÃO, ESCOLA DE FORMAÇÃO etc.) ganham
      // o destaque visual de "evolução" — são pontos de virada da campanha.
      if (/^(MANIFESTA|ESCOLA|EXPROPRIA|GREVE GERAL)/.test(e.texto)) return 'evolucao';
      return 'narrativa';
    case 'organizacaoEvoluiu': return 'evolucao';
    case 'maquinasVorazes': return 'vermelho';
    case 'colapso': return 'vermelho';
    default: return 'evento';
  }
}

function textoEvento(e: EventoPartida): string {
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
    case 'narrativa':
      return e.texto;
  }
}
