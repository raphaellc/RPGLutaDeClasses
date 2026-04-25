import { Trabalhador } from '@domain/entities/Trabalhador';
import { Barra } from './Barra';

const NOMES_ARQUETIPO: Record<string, string> = {
  ferreiroEngrenagens: 'Ferreiro de Engrenagens',
  fantasmaRede: 'Fantasma da Rede',
  tradutorVerdades: 'Tradutor de Verdades',
};

interface Props {
  trabalhador: Trabalhador;
  destaque?: boolean;
  acoes?: React.ReactNode;
}

export function CartaoTrabalhador({ trabalhador: t, destaque, acoes }: Props) {
  return (
    <div className={`painel cartao-personagem ${t.colapsado ? 'colapsado' : ''} ${destaque ? 'vermelho' : ''}`}>
      <h3>
        <span>{t.nome}</span>
        <span className="badge ouro">{NOMES_ARQUETIPO[t.arquetipo]}</span>
      </h3>
      <Barra tipo="pv" valor={t.recursos.pv} max={t.limites.pvMax} rotulo="Tempo de Vida" />
      <Barra tipo="tl" valor={t.recursos.tl} max={t.limites.tlMax} rotulo="Tempo Livre" />
      <Barra tipo="cm" valor={t.recursos.cm} max={t.limites.cmMax} rotulo="Cond. Mat." />
      <div className="linha-status">
        <span className="label">Consciência</span>
        <span className="valor">{t.recursos.cc}</span>
        <span style={{ flex: 1 }} />
        {t.imunidadeStatusTurnos > 0 && (
          <span className="badge ouro" title="Imune a novos status negativos">
            ✦ Escudo {t.imunidadeStatusTurnos}t
          </span>
        )}
        {t.status.length > 0 && (
          <span className="badge vermelho" style={{ marginLeft: 8 }}>
            ⛓ {t.status.map((s) => `${s.tipo} (${s.turnosRestantes}t)`).join(', ')}
          </span>
        )}
      </div>
      {t.colapsado && <p style={{ marginTop: 8, color: 'var(--vermelho-revolucao)', fontWeight: 700 }}>COLAPSADO — Tempo de Vida exaurido.</p>}
      {acoes && <div className="acoes-grid">{acoes}</div>}
    </div>
  );
}
