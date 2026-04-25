import { Organizacao, LIMIARES_NIVEL } from '@domain/entities/Organizacao';
import { habilidadesDisponiveis } from '@domain/services/EvolucaoOrganizacao';

const NOMES_NIVEL: Record<number, string> = {
  1: 'Célula de Base',
  2: 'Sindicato Combativo',
  3: 'Partido / Mov. de Massas',
  4: 'Conselho / Comuna',
};

export function PainelOrganizacao({ org }: { org: Organizacao }) {
  const proxLimiar = LIMIARES_NIVEL[(org.nivel + 1) as 2 | 3 | 4];
  const habilidades = habilidadesDisponiveis(org);

  return (
    <div className="painel ouro">
      <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>⚒ {org.nome}</span>
        <span className="badge ouro">NÍVEL {org.nivel} — {NOMES_NIVEL[org.nivel]}</span>
      </h3>
      <p className="subtitulo">Fundo de Greve</p>
      <div className="linha-status">
        <span className="label">CM</span>
        <span className="valor">{org.fundoDeGreve.cm}</span>
        <span style={{ width: 16 }} />
        <span className="label">TL</span>
        <span className="valor">{org.fundoDeGreve.tl}</span>
      </div>
      <div className="linha-status">
        <span className="label">Consc. Coletiva</span>
        <span className="valor">{org.ccColetivaAcumulada}</span>
        {proxLimiar && (
          <span style={{ marginLeft: 8, color: 'var(--branco-manifesto-2)', fontSize: 12 }}>
            (próximo nível: {proxLimiar})
          </span>
        )}
      </div>
      <p className="subtitulo">Habilidades Desbloqueadas</p>
      <ul style={{ listStyle: 'none', fontSize: 12 }}>
        {habilidades.map((h) => (
          <li key={h}>· {h}</li>
        ))}
      </ul>
    </div>
  );
}
