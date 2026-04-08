import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppNav({ title }) {
  const { logout } = useAuth();

  return (
    <header className="nav">
      <Link to="/">Agence</Link>
      <nav>
        <Link to="/insights">Insights</Link>
        <Link to="/expenses">Expenses</Link>
        <Link to="/goals">Goals</Link>
        <Link to="/portfolio">Portfolio</Link>
        <button onClick={logout}>Sign out</button>
      </nav>
    </header>
  );
}
