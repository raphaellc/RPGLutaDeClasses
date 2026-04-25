import { useEffect, useRef } from 'react';
import { EntradaLog } from '../hooks/useEstadoPartida';
import { textoEvento, classeEvento } from '../utils/eventoTexto';

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
        <div key={e.id} className={`entrada ${classeEvento(e.evento)}`}>
          <span style={{ color: 'var(--ouro-operario)' }}>[T{e.turno}]</span> {textoEvento(e.evento)}
        </div>
      ))}
    </div>
  );
}
