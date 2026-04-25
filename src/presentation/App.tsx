import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { Inicio } from './pages/Inicio';
import { CriacaoPartida } from './pages/CriacaoPartida';
import { PartidaTurnoATurno } from './pages/PartidaTurnoATurno';
import { PartidaSimulada } from './pages/PartidaSimulada';

function NaoEncontrado() {
  return (
    <main className="intro">
      <h1 className="titulo-cartaz">404</h1>
      <p className="citacao">"A Metrópole-Máquina não reconhece esta rota. Mas a classe trabalhadora não se perde."</p>
      <div className="controles" style={{ marginTop: 24 }}>
        <Link to="/"><button className="primaria">Voltar ao Manifesto</button></Link>
      </div>
    </main>
  );
}

export function App() {
  return (
    <HashRouter>
      <header className="cabecalho">
        <div className="marca">⚒ O CAPITAL · LUTA DE CLASSES</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'ativo' : '')}>Manifesto</NavLink>
          <NavLink to="/nova" className={({ isActive }) => (isActive ? 'ativo' : '')}>Nova Partida</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/nova" element={<CriacaoPartida />} />
        <Route path="/turno" element={<PartidaTurnoATurno />} />
        <Route path="/simulado" element={<PartidaSimulada />} />
        <Route path="*" element={<NaoEncontrado />} />
      </Routes>
    </HashRouter>
  );
}
