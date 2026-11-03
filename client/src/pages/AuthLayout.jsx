import { LogoIcon } from '../components/Icons.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-aside" aria-hidden="true">
        <div className="brand brand-light">
          <span className="brand-mark">
            <LogoIcon />
          </span>
          <span className="brand-name">StockFlow</span>
        </div>
        <div className="auth-pitch">
          <h2>Know what's on your shelves.</h2>
          <p>Track products, quantities and prices in one place, and catch low stock before it costs you a sale.</p>
        </div>
        <ul className="auth-points">
          <li>Products with SKU, quantity and pricing</li>
          <li>Low-stock alerts on your dashboard</li>
          <li>Your data, private to your organization</li>
        </ul>
      </section>

      <section className="auth-main">
        <div className="auth-card">
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
        <p className="auth-footer">{footer}</p>
      </section>
    </div>
  );
}
