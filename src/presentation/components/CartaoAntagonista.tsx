import { Antagonista } from '@domain/entities/Antagonista';
import { Barra } from './Barra';

const NOMES_ARQUETIPO: Record<string, string> = {
  capitalistaIndustrial: 'Capitalista Industrial',
  senhorNuvens: 'Senhor das Nuvens',
  estadoBurgues: 'Estado Burguês',
};

const MECANICA_ARQUETIPO: Record<string, string> = {
  capitalistaIndustrial: 'Máquinas Vorazes — AoE passivo cada turno',
  senhorNuvens: 'Tarifa Dinâmica — dano ×2 a cada 3 turnos · Alienação',
  estadoBurgues: 'Polícia de Choque — split PV+CM · Fetichismo',
};

export function CartaoAntagonista({ antagonista: a }: { antagonista: Antagonista }) {
  const percentualCapital = a.capitalAcumuladoMax > 0
    ? Math.round((a.capitalAcumulado / a.capitalAcumuladoMax) * 100)
    : 0;

  return (
    <div className={`painel ${a.derrotado ? 'colapsado' : 'vermelho'}`}>
      <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span>⚙ {a.nome}</span>
        <span className="badge vermelho" style={{ whiteSpace: 'nowrap' }}>
          {NOMES_ARQUETIPO[a.arquetipo]}
        </span>
      </h3>

      <p style={{ fontSize: 11, color: 'var(--branco-manifesto-2)', marginBottom: 6, fontStyle: 'italic' }}>
        {MECANICA_ARQUETIPO[a.arquetipo]}
      </p>

      <Barra tipo="capital" valor={a.capitalAcumulado} max={a.capitalAcumuladoMax} rotulo="Capital Acumulado" />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {a.bloqueadoNoTurno && (
          <span className="badge ouro" title="O Piquete bloqueou este antagonista neste turno">
            ✊ PIQUETE
          </span>
        )}
        {a.emTarifaDinamica && (
          <span
            className="badge vermelho"
            title="Tarifa Dinâmica ativa — dano dobrado neste turno (Modo Pico)"
            style={{ animation: 'none', fontWeight: 900 }}
          >
            ⚡ TARIFA DINÂMICA ×2
          </span>
        )}
        {a.derrotado && (
          <p style={{ marginTop: 4, color: 'var(--ouro-operario)', fontWeight: 700 }}>
            EXPROPRIADO — Os meios de produção estão na mão da classe.
          </p>
        )}
      </div>

      {!a.derrotado && (
        <div style={{ fontSize: 11, color: 'var(--branco-manifesto-2)', marginTop: 4 }}>
          {percentualCapital}% de capital restante
        </div>
      )}
    </div>
  );
}
