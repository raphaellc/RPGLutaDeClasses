/**
 * PainelReferencia — drawer lateral com resumo das regras do jogo.
 * Abre sobre qualquer página sem sair do contexto atual.
 */

interface Props {
  onFechar: () => void;
}

interface LinhaProps {
  chave: string;
  valor: string;
}

function Linha({ chave, valor }: LinhaProps) {
  return (
    <div className="ref-linha">
      <span className="ref-chave">{chave}</span>
      <span className="ref-valor">{valor}</span>
    </div>
  );
}

export function PainelReferencia({ onFechar }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div className="drawer-overlay" onClick={onFechar} />

      {/* Drawer */}
      <aside className="drawer-referencia" role="dialog" aria-modal="true" aria-label="Referência rápida">
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24, margin: 0 }}>Referência Rápida</h2>
          <button onClick={onFechar} style={{ fontSize: 18, padding: '4px 10px' }} title="Fechar">✕</button>
        </div>

        {/* ── Recursos ── */}
        <section>
          <h3>Recursos dos Trabalhadores</h3>
          <Linha chave="PV — Tempo de Vida"   valor="Energia corporal. Chegar a 0 causa colapso e retira o trabalhador do jogo." />
          <Linha chave="TL — Tempo Livre"     valor="Energia política. Gasto em Ações Diretas, Desmistificação e Escola de Formação." />
          <Linha chave="CM — Condições Mat."  valor="Recursos econômicos. Gasto em Solidariedade, Piquete e Greve Geral." />
          <Linha chave="CC — Consciência"     valor="Acumulada coletivamente; determina o nível da Organização. Alvo preferencial do Capital." />
        </section>

        {/* ── Arquétipos ── */}
        <section>
          <h3>Arquétipos de Trabalhador</h3>
          <Linha chave="Ferreiro de Engrenagens" valor="Proletário Fabril. Descansar restaura PV completo e garante no mínimo 2 TL." />
          <Linha chave="Fantasma da Rede"        valor="Uberizado. Pode Folgar (–2 CM, +5 TL). Em queima constante — decai sem descanso." />
          <Linha chave="Tradutor de Verdades"    valor="Intelectual orgânico. Pode Desmistificar (–3 TL) para curar um status de aliado." />
          <Linha chave="Jornalista Militante"   valor="Repórter de base. Pode Publicar Denúncia (–4 TL) para remover Fetichismo de TODA a classe de uma vez." />
        </section>

        {/* ── Status ── */}
        <section>
          <h3>Efeitos de Status</h3>
          <Linha chave="Alienação"   valor="–1 CC por turno. Aplicada pelo Senhor das Nuvens. Curada por Desmistificação ou CC alta." />
          <Linha chave="Fetichismo"  valor="Bloqueia Solidariedade e Contribuição. Aplicado pelo Estado Burguês a cada 3 turnos." />
          <Linha chave="Esgotamento" valor="–1 PV por turno. Aplicado em circunstâncias extremas de exploração." />
        </section>

        {/* ── Ações por turno ── */}
        <section>
          <h3>Ações por Turno (Turno dos Jogadores)</h3>
          <Linha chave="Solidariedade"    valor="–1 CM do doador → +2 TL ao receptor. Requer alvo e CM disponível. Bloqueado por Fetichismo." />
          <Linha chave="Contribuir p/Org" valor="Envia CM, TL e CC ao Fundo de Greve. Bloqueado por Fetichismo." />
          <Linha chave="Desmistificar"    valor="(Tradutor, –3 TL) Cura um status de qualquer aliado com status ativo." />
          <Linha chave="Folgar"           valor="(Fantasma) –2 CM, +5 TL. Só disponível para o Fantasma da Rede." />
          <Linha chave="Descansar"        valor="Recupera PV e TL segundo o arquétipo. Não gasta recursos." />
          <Linha chave="Ação Direta"      valor="Rola 1d6. Sucesso (4–6): causa dano ao Capital. Falha (1–3): custo sem dano. Escolha eixo (PV/TL/CM) e intenção narrativa." />
          <Linha chave="Publicar Denúncia" valor="(Jornalista, –4 TL) Remove Fetichismo de toda a classe de uma vez. Único antídoto coletivo contra o Estado Burguês." />
        </section>

        {/* ── Organização ── */}
        <section>
          <h3>Organização e Ações Coletivas</h3>
          <p style={{ fontSize: 12, color: 'var(--branco-manifesto-2)', marginBottom: 8 }}>
            A CC coletiva acumulada determina o nível. Ações coletivas consomem o Fundo de Greve.
          </p>

          <div className="ref-nivel">Nível 1 — Célula (10 CC)</div>
          <Linha chave="Contribuir" valor="Alimenta o Fundo de Greve para desbloquear ações coletivas." />

          <div className="ref-nivel">Nível 2 — Sindicato Combativo (30 CC)</div>
          <Linha chave="Piquete" valor="–5 CM do Fundo. Bloqueia o antagonista por 1 turno completo." />

          <div className="ref-nivel">Nível 3 — Partido / Movimento (60 CC)</div>
          <Linha chave="Greve Geral"       valor="–15 CM e –20 TL do Fundo. Derrota o antagonista alvo." />
          <Linha chave="Manifestação"      valor="–10 TL do Fundo. Escudo coletivo — mitiga dano do próximo ataque." />
          <Linha chave="Escola de Form."   valor="–15 TL e –5 CM do Fundo. Imunidade permanente a Alienação e Fetichismo para toda a classe." />

          <div className="ref-nivel">Nível 4 — Conselho / Comuna (100 CC)</div>
          <Linha chave="Expropriar" valor="Sem custo de Fundo. Derrota o antagonista e transfere meios de produção. Condição de vitória máxima." />
        </section>

        {/* ── Antagonistas ── */}
        <section>
          <h3>Antagonistas — Mecânicas Exclusivas</h3>
          <Linha
            chave="Capitalista Industrial"
            valor="Máquinas Vorazes: dano AoE passivo a todos os trabalhadores a cada turno — sem mitigação por CM. Também extrai mais-valia do trabalhador com menor PV."
          />
          <Linha
            chave="Estado Burguês"
            valor="Polícia de Choque: dano split — parte vai a PV, parte vai a CM, ambos diretos sem armadura. Aplica Fetichismo a cada 3 turnos."
          />
          <Linha
            chave="Senhor das Nuvens"
            valor="Tarifa Dinâmica: a cada 3 turnos ativa ×2 na extração de mais-valia. Aplica Alienação a cada 2 turnos. Alvo preferencial: Fantasma da Rede."
          />
        </section>

        {/* ── Condições de vitória/derrota ── */}
        <section>
          <h3>Fim de Jogo</h3>
          <Linha chave="Vitória Proletária" valor="Todos os antagonistas são derrotados (Greve Geral ou Expropriar)." />
          <Linha chave="Derrota do Grupo"   valor="Todos os trabalhadores colapsam (PV zerado)." />
        </section>

        <button className="secundaria" onClick={onFechar} style={{ marginTop: 8 }}>
          Fechar referência
        </button>
      </aside>
    </>
  );
}
