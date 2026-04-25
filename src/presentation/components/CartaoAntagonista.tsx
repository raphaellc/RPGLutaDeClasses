import { Antagonista } from '@domain/entities/Antagonista';
import { Barra } from './Barra';

const NOMES_ARQUETIPO: Record<string, string> = {
  capitalistaIndustrial: 'Capitalista Industrial',
  senhorNuvens: 'Senhor das Nuvens',
  estadoBurgues: 'Estado Burguês',
};

export function CartaoAntagonista({ antagonista: a }: { antagonista: Antagonista }) {
  return (
    <div className={`painel ${a.derrotado ? 'colapsado' : 'vermelho'}`}>
      <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>⚙ {a.nome}</span>
        <span className="badge vermelho">{NOMES_ARQUETIPO[a.arquetipo]}</span>
      </h3>
      <Barra tipo="capital" valor={a.capitalAcumulado} max={a.capitalAcumuladoMax} rotulo="Capital Acum." />
      {a.bloqueadoNoTurno && <span className="badge ouro">BLOQUEADO PELO PIQUETE</span>}
      {a.derrotado && <p style={{ marginTop: 8, color: 'var(--ouro-operario)', fontWeight: 700 }}>EXPROPRIADO — Os meios de produção estão na mão da classe.</p>}
    </div>
  );
}
