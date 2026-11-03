import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { formatMoney, formatNumber } from '../format.js';
import { AlertIcon, BoxIcon, CheckIcon, PlusIcon } from '../components/Icons.jsx';
import StockBadge from '../components/StockBadge.jsx';
import { ErrorState, LoadingState } from './states.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.dashboard().then(setData).catch(setError);
  };
  useEffect(load, []);

  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!data) return <LoadingState />;

  const { summary, lowStockItems } = data;
  const cards = [
    { label: 'Total products', value: formatNumber(summary.totalProducts) },
    { label: 'Units on hand', value: formatNumber(summary.totalQuantity) },
    {
      label: 'Low stock items',
      value: formatNumber(summary.lowStockCount),
      tone: summary.lowStockCount > 0 ? 'warning' : undefined,
    },
    { label: 'Stock value (cost)', value: formatMoney(summary.inventoryValue) },
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Inventory overview for {user.organizationName}.</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <PlusIcon />
          Add product
        </Link>
      </header>

      <section className="stat-grid" aria-label="Inventory summary">
        {cards.map((card) => (
          <div key={card.label} className={`stat-card ${card.tone ? `stat-${card.tone}` : ''}`}>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{card.value}</span>
          </div>
        ))}
      </section>

      {summary.totalProducts === 0 ? (
        <section className="panel empty-state">
          <span className="empty-icon">
            <BoxIcon width={28} height={28} />
          </span>
          <h2>Add your first product</h2>
          <p className="muted">Products you add will show up here, along with anything running low.</p>
          <Link to="/products/new" className="btn btn-primary">
            <PlusIcon />
            Add product
          </Link>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                <AlertIcon className="icon-warning" />
                Low stock items
              </h2>
              <p className="muted">
                Products at or below their low stock threshold (default:{' '}
                {summary.defaultLowStockThreshold} units).
              </p>
            </div>
            {lowStockItems.length > 0 && (
              <Link to="/products?lowStock=true" className="btn btn-secondary btn-sm">
                View in products
              </Link>
            )}
          </div>

          {lowStockItems.length === 0 ? (
            <div className="empty-inline">
              <CheckIcon className="icon-ok" />
              Everything is well stocked.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th className="num">Quantity on hand</th>
                    <th className="num">Low stock threshold</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link to={`/products/${item.id}`} className="row-link">
                          {item.name}
                        </Link>
                      </td>
                      <td className="mono">{item.sku}</td>
                      <td className="num strong">{formatNumber(item.quantityOnHand)}</td>
                      <td className="num">
                        {item.effectiveThreshold}
                        {item.lowStockThreshold === null && <span className="tag">default</span>}
                      </td>
                      <td>
                        <StockBadge quantity={item.quantityOnHand} threshold={item.effectiveThreshold} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
