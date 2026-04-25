import { Link } from 'react-router-dom';

export function Inicio() {
  return (
    <main className="intro">
      <h1 className="titulo-cartaz">A Metrópole-Máquina respira exaustão.</h1>

      <p className="citacao">
        "Esqueçam os dragões e as masmorras. O verdadeiro monstro veste um fato de corte impecável e habita
        as frestas entre os segundos. O Capital é um Leviatã pálido, um deus-aranha tecido com fibra ótica e
        fuligem."
      </p>

      <p>
        <strong>O Capital · Luta de Classes</strong> é um RPG em que vocês não são heróis predestinados — são
        os despossuídos. Não acumulam ouro: gastam Tempo de Vida (PV), Tempo Livre (TL) e Condições
        Materiais (CM) tentando despertar a Consciência de Classe.
      </p>

      <p>
        Os antagonistas — Capitalista Industrial, Algoritmo-Feitor, Estado Burguês — são <strong>NPCs</strong>
        controlados pela Voz do Sistema. Vocês jogam apenas pelo lado da classe trabalhadora.
      </p>

      <h3 className="subtitulo">Modos de jogo</h3>
      <ul style={{ marginLeft: 24 }}>
        <li><strong>Turno-a-turno:</strong> você comanda os trabalhadores, a IA do Capital responde.</li>
        <li><strong>Simulado:</strong> assista uma partida rodando sozinha, com heurísticas para os dois lados.</li>
      </ul>

      <div className="controles" style={{ marginTop: 32 }}>
        <Link to="/nova"><button className="primaria">Iniciar Partida</button></Link>
      </div>

      <h3 className="subtitulo" style={{ marginTop: 48 }}>Arquitetura</h3>
      <p style={{ fontSize: 12, color: 'var(--branco-manifesto-2)' }}>
        Domain · Application · Infrastructure · Presentation. Regras puras em TypeScript no
        domínio; React isolado na apresentação. Persistência via LocalStorage substituível por
        qualquer outra implementação da porta <code>PartidaRepository</code>.
      </p>
    </main>
  );
}
