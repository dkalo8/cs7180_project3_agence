import { Link } from 'react-router-dom';

export default function AppNav() {
  return (
    <header className="nav">
      <Link to="/">Agence</Link>
      <nav>
        <Link to="/insights">Insights</Link>
        <Link to="/expenses">Expenses</Link>
        <Link to="/watchlist">Watchlist</Link>
        <Link to="/goals">Goals</Link>
        <Link to="/portfolio">Portfolio</Link>
        <Link to="/settings">Account</Link>
      </nav>
    </header>
  );
}
