import { Link, Route, Routes } from 'react-router-dom';
import GamesListPage from './pages/GamesListPage';
import GameDetailPage from './pages/GameDetailPage';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="app-header__title">
          Skytech Games
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<GamesListPage />} />
          <Route path="/games/:slug" element={<GameDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
