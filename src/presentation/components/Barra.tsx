interface Props {
  tipo: 'pv' | 'tl' | 'cm' | 'capital';
  valor: number;
  max: number;
  rotulo?: string;
}

export function Barra({ tipo, valor, max, rotulo }: Props) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (valor / max) * 100)) : 0;
  return (
    <div className="linha-status">
      <span className="label">{rotulo ?? tipo.toUpperCase()}</span>
      <div className={`barra ${tipo}`} style={{ flex: 1 }}>
        <div className="preenchimento" style={{ width: `${pct}%` }} />
      </div>
      <span className="valor">{valor}/{max}</span>
    </div>
  );
}
