import { Trabalhador } from '@domain/entities/Trabalhador';
import { Antagonista } from '@domain/entities/Antagonista';
import { EstatisticasSimulacao } from '@application/game-modes/MotorSimulado';
import { Partida } from '@domain/entities/Partida';

export interface PropsTelaFinal {
  fase: Partida['fase'];
  estatisticas: EstatisticasSimulacao;
  /** Trabalhadores do início da partida — para resolver nomes por id. */
  trabalhadores: ReadonlyArray<Trabalhador>;
  /** Antagonistas do início da partida — para resolver nomes por id. */
  antagonistas: ReadonlyArray<Antagonista>;
  onNova: () => void;
}

// ── Prosa contextual ──────────────────────────────────────────────────────────

function prosaVitoria(stats: EstatisticasSimulacao): string {
  if (stats.expropriado) {
    return (
      'A última barricada foi derrubada. Os meios de produção passaram para as mãos do Conselho Operário. ' +
      'O Capital não é uma lei natural — é uma escolha. E a classe escolheu diferente.'
    );
  }
  if (stats.greveGeralConvocada) {
    return (
      'A Greve Geral paralisou a Metrópole-Máquina. Pela primeira vez, o silêncio das máquinas ' +
      'não soou como derrota — soou como poder coletivo.'
    );
  }
  if (stats.escolaFundada) {
    return (
      'A formação política foi a arma decisiva. Quando a classe entendeu o próprio sistema, ' +
      'o sistema já havia perdido. Marx, Lênin e Rosa não escreveram em vão.'
    );
  }
  return (
    'Os trabalhadores provaram que a solidariedade é mais forte que qualquer algoritmo. ' +
    'O Capital recuou. A Metrópole-Máquina aprendeu que o tempo dos trabalhadores ' +
    'não é uma mercadoria infinita.'
  );
}

function prosaDerrota(stats: EstatisticasSimulacao): string {
  if (stats.turnosJogados > 20) {
    return (
      `Resistiram por ${stats.turnosJogados} turnos. A história registra: nem sempre vencer é o único ato de coragem. ` +
      'A próxima geração saberá onde parar a máquina — e desta vez não parará até o fim.'
    );
  }
  if (stats.antagonistasDerrotados.length > 0) {
    return (
      'Caíram de pé. Antes do fim, conseguiram derrubar parte do Capital. ' +
      'A derrota de hoje alimenta a consciência de amanhã.'
    );
  }
  return (
    'A Metrópole-Máquina não hesita. Mas ela tem uma fraqueza: ' +
    'precisa que trabalhemos. A luta apenas começou — ' +
    'e o Capital sabe disso melhor do que ninguém.'
  );
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TelaFinal({ fase, estatisticas: s, trabalhadores, antagonistas, onNova }: PropsTelaFinal) {
  const vitoria = fase === 'vitoriaProletaria';

  const nomeAnt  = (id: string) => antagonistas.find((a) => a.id === id)?.nome ?? id;
  const nomeTrab = (id: string) => trabalhadores.find((t) => t.id === id)?.nome ?? id;

  const prosa = vitoria ? prosaVitoria(s) : prosaDerrota(s);

  return (
    <div className={`bandeira-fim ${vitoria ? 'vitoria' : 'derrota'}`}>
      <h2>{vitoria ? '★ A CLASSE VENCEU' : 'A METRÓPOLE ESMAGOU'}</h2>

      <p style={{ maxWidth: 560, margin: '0 auto var(--esp-5)', fontStyle: 'italic', lineHeight: 1.6 }}>
        {prosa}
      </p>

      <table
        className="tabela-recursos"
        style={{ width: '100%', maxWidth: 520, margin: '0 auto var(--esp-5)' }}
      >
        <tbody>
          <tr>
            <td><strong>Turnos jogados</strong></td>
            <td>{s.turnosJogados}</td>
          </tr>
          <tr>
            <td><strong>Antagonistas derrotados</strong></td>
            <td>
              {s.antagonistasDerrotados.length === 0
                ? '—'
                : s.antagonistasDerrotados.map(nomeAnt).join(', ')}
            </td>
          </tr>
          <tr>
            <td><strong>Trabalhadores colapsados</strong></td>
            <td>
              {s.trabalhadoresColapsados.length === 0
                ? 'Nenhum'
                : s.trabalhadoresColapsados.map(nomeTrab).join(', ')}
            </td>
          </tr>
          {s.greveGeralConvocada && (
            <tr>
              <td colSpan={2} style={{ color: 'var(--ouro-operario)' }}>★ Greve Geral convocada</td>
            </tr>
          )}
          {s.escolaFundada && (
            <tr>
              <td colSpan={2} style={{ color: 'var(--ouro-operario)' }}>★ Escola de Formação fundada</td>
            </tr>
          )}
          {s.expropriado && (
            <tr>
              <td colSpan={2} style={{ color: 'var(--ouro-operario)' }}>★ Expropriação realizada</td>
            </tr>
          )}
        </tbody>
      </table>

      <button className="primaria" onClick={onNova}>Nova Partida</button>
    </div>
  );
}
