import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';
import { formatMoney, formatNumber } from '../format.js';
import { BoxIcon, PlusIcon, SearchIcon } from '../components/Icons.jsx';
import StockBadge from '../components/StockBadge.jsx';
import { AdjustStockDialog, ConfirmDialog } from '../components/Dialog.jsx';
import { ErrorState, LoadingState } from './states.jsx';

export default function Products() {
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const search = params.get('search') ?? '';
  const lowStock = params.get('lowStock') === 'true';

  const [query, setQuery] = useState(search);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const setFilter = useCallback(
    (key, value) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  // Debounce typing before it hits the URL (and therefore the API).
  useEffect(() => {
    const t = setTimeout(() => setFilter('search', query.trim()), 250);
    return () => clearTimeout(t);
  }, [query, setFilter]);

  const load = useCallback(() => {
    setError(null);
    api
      .listProducts({ search, lowStock })
      .then(({ products }) => setProducts(products))
      .catch(setError);
  }, [search, lowStock]);
  useEffect(load, [load]);

  const replaceProduct = (updated) =>
    setProducts((list) => list.map((p) => (p.id === updated.id ? updated : p)));

  const confirmDelete = async () => {
    try {
      await api.deleteProduct(deleting.id);
      setProducts((list) => list.filter((p) => p.id !== deleting.id));
      notify(`Deleted "${deleting.name}".`);
      setDeleting(null);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const filtered = Boolean(search || lowStock);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Products</h1>
          <p className="muted">Manage your catalogue and stock levels.</p>
        </div>
        <Link to="/products/new" className="btn btn-primary">
          <PlusIcon />
          Add product
        </Link>
      </header>

      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <SearchIcon />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              placeholder="Search by name or SKU"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => setFilter('lowStock', e.target.checked ? 'true' : '')}
            />
            <span>Low stock only</span>
          </label>
          {products && (
            <span className="muted toolbar-count">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
          )}
        </div>

        {error ? (
          <ErrorState error={error} onRetry={load} />
        ) : !products ? (
          <LoadingState />
        ) : products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <BoxIcon width={28} height={28} />
            </span>
            {filtered ? (
              <>
                <h2>No matching products</h2>
                <p className="muted">Try a different search or clear the filters.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuery('');
                    setParams({}, { replace: true });
                  }}
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <h2>No products yet</h2>
                <p className="muted">Add your first product to start tracking inventory.</p>
                <Link to="/products/new" className="btn btn-primary">
                  <PlusIcon />
                  Add product
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th className="num">Quantity</th>
                  <th>Stock status</th>
                  <th className="num">Selling price</th>
                  <th className="actions-col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.isLowStock ? 'row-low' : undefined}>
                    <td>
                      <Link to={`/products/${p.id}`} className="row-link">
                        {p.name}
                      </Link>
                    </td>
                    <td className="mono">{p.sku}</td>
                    <td className="num strong">{formatNumber(p.quantityOnHand)}</td>
                    <td>
                      <StockBadge quantity={p.quantityOnHand} threshold={p.effectiveThreshold} />
                    </td>
                    <td className="num">{formatMoney(p.sellingPrice)}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAdjusting(p)}
                        >
                          Adjust
                        </button>
                        <Link to={`/products/${p.id}`} className="btn btn-ghost btn-sm">
                          Edit
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-danger-text"
                          onClick={() => setDeleting(p)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdjustStockDialog
        product={adjusting}
        onClose={() => setAdjusting(null)}
        onSaved={(updated) => {
          replaceProduct(updated);
          setAdjusting(null);
          notify(`${updated.name} now has ${updated.quantityOnHand} units.`);
          if (lowStock && !updated.isLowStock) load();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete product?"
        message={
          deleting && (
            <>
              <strong>{deleting.name}</strong> ({deleting.sku}) will be permanently removed. This
              can't be undone.
            </>
          )
        }
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
