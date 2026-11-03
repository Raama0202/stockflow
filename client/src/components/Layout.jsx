import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import { BoxIcon, DashboardIcon, LogoIcon, LogoutIcon, SettingsIcon } from './Icons.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/products', label: 'Products', icon: BoxIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <LogoIcon />
          </span>
          <span className="brand-name">StockFlow</span>
        </div>

        <nav className="nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="org-card">
            <span className="org-name" title={user.organizationName}>
              {user.organizationName}
            </span>
            <span className="org-email" title={user.email}>
              {user.email}
            </span>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={handleLogout}>
            <LogoutIcon />
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
