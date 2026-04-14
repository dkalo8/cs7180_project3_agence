import { Link } from 'react-router-dom';

export default function AppNav() {
  return (
    <header className="nav">
      <Link to="/">Agence</Link>
      <nav>
        <Link to="/insights">Insights</Link>
        <Link to="/about">About</Link>

        <div className="nav-dropdown">
          <span className="nav-dropdown-trigger">Money</span>
          <div className="nav-dropdown-menu">
            <Link to="/expenses">Expenses</Link>
            <Link to="/goals">Goals</Link>
          </div>
        </div>

        <div className="nav-dropdown">
          <span className="nav-dropdown-trigger">Markets</span>
          <div className="nav-dropdown-menu">
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/watchlist">Watchlist</Link>
          </div>
        </div>

        <Link to="/settings">Account</Link>
      </nav>
    </header>
  );
}
