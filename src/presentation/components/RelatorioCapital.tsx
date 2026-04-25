import { useEffect } from 'react';
import { EventoPartida } from '@domain/events/EventosDePartida';
import { textoEvento, classeEvento } from '../utils/eventoTexto';

interface Props {
  turno: number;
  eventos: ReadonlyArray<EventoPartida>;
  onFechar: () => void;
}

// Eventos que não acrescentam informação no resumo do Capital
const TIPOS_SILENCIOSOS = new Set<EventoPartida['tipo']>(['narrativa']);

export function RelatorioCapital({ turno, eventos, onFechar }: Props) {
  const visiveis = eventos.filter((e) => !TIPOS_SILENCIOSOS.has(e.tipo));

  const temColapso   = eventos.some((e) => e.tipo === 'colapso');
  const temDerrotado = eventos.some((e) => e.tipo === 'antagonistaDerrotado');

  // Fechar com Escape
  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') onFechar();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-overlay"
        onClick={onFechar}
        style={{ background: 'rgba(0,0,0,0.75)' }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Relatório do turno do Capital"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 'min(560px, 95vw)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--cinza-chumbo-escuro)',
          border: '3px solid var(--vermelho-revolucao)',
        }}
      >
        {/* Cabeçalho */}
        <div style={{
          background: 'var(--vermelho-revolucao)',
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'var(--fonte-display)', fontSize: 15, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Turno {turno} — Voz do Sistema Agiu
          </span>
          <button
            onClick={onFechar}
            style={{ background: 'transparent', border: 'none', color: 'inherit', fontSize: 18, padding: '0 4px', cursor: 'pointer' }}
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Eventos */}
        <div style={{ overflowY: 'auto', padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiveis.length === 0 ? (
            <p style={{ color: 'var(--branco-manifesto-2)', fontStyle: 'italic', fontSize: 13 }}>
              O Capital observou. Por ora, sem ataque direto.
            </p>
          ) : (
            visiveis.map((e, i) => (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  borderLeft: `3px solid ${corEvento(classeEvento(e))}`,
                  paddingLeft: 10,
                  color: classeEvento(e) === 'vermelho' ? '#ff6b6b' : 'var(--branco-manifesto)',
                  fontWeight: classeEvento(e) === 'vermelho' ? 700 : 400,
                }}
              >
                {textoEvento(e)}
              </div>
            ))
          )}

          {/* Resumo de consequências graves */}
          {(temColapso || temDerrotado) && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--preto-carvao)',
              border: '1px solid var(--cinza-chumbo-claro)',
              fontSize: 12,
              color: 'var(--branco-manifesto-2)',
            }}>
              {temColapso   && <div>⚠ Um ou mais trabalhadores colapsaram neste turno.</div>}
              {temDerrotado && <div>★ Um antagonista foi derrotado!</div>}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--cinza-chumbo-claro)' }}>
          <button className="primaria" onClick={onFechar} style={{ width: '100%' }}>
            Retomar o Turno dos Trabalhadores
          </button>
        </div>
      </div>
    </>
  );
}

function corEvento(cls: string): string {
  if (cls === 'vermelho')  return 'var(--vermelho-revolucao)';
  if (cls === 'evolucao')  return 'var(--ouro-operario)';
  if (cls === 'narrativa') return 'var(--branco-manifesto-2)';
  return 'var(--cinza-chumbo-claro)';
}
