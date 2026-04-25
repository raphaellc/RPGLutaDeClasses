import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Inicio } from './pages/Inicio';
import { CriacaoPartida } from './pages/CriacaoPartida';
import { PartidaTurnoATurno } from './pages/PartidaTurnoATurno';
import { PartidaSimulada } from './pages/PartidaSimulada';

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
      </Routes>
    </HashRouter>
  );
}
