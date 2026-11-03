import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import { formatDate, formatMoney } from '../format.js';
import Field from '../components/Field.jsx';
import StockBadge from '../components/StockBadge.jsx';
import { AdjustStockDialog, ConfirmDialog } from '../components/Dialog.jsx';
import { ErrorState, LoadingState } from './states.jsx';

const EMPTY = {
  name: '',
  sku: '',
  description: '',
  quantityOnHand: '0',
  costPrice: '',
  sellingPrice: '',
  lowStockThreshold: '',
};

const toForm = (p) =>
  Object.fromEntries(Object.keys(EMPTY).map((key) => [key, p[key] === null ? '' : String(p[key])]));

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const notify = useToast();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isNew) {
      setProduct(null);
      setForm(EMPTY);
      return;
    }
    setLoadError(null);
    api
      .getProduct(id)
      .then(({ product }) => {
        setProduct(product);
        setForm(toForm(product));
      })
      .catch(setLoadError);
  }, [id, isNew]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (isNew) {
        const { product } = await api.createProduct(form);
        notify(`Added "${product.name}".`);
      } else {
        const { product } = await api.updateProduct(id, form);
        notify(`Saved "${product.name}".`);
      }
      navigate('/products');
    } catch (err) {
      setErrors({ ...err.fields, form: err.fields ? null : err.message });
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await api.deleteProduct(id);
      notify(`Deleted "${product.name}".`);
      navigate('/products');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (loadError) {
    return (
      <>
        <BackLink />
        <ErrorState error={loadError} />
      </>
    );
  }
  if (!isNew && !product) return <LoadingState />;

  const defaultThreshold = user.defaultLowStockThreshold;

  return (
    <>
      <BackLink />
      <header className="page-header">
        <div>
          <h1>{isNew ? 'Add product' : product.name}</h1>
          <p className="muted">
            {isNew ? 'Fill in the details for a new product.' : `SKU ${product.sku}`}
          </p>
        </div>
        {!isNew && (
          <div className="header-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setAdjusting(true)}>
              Adjust stock
            </button>
            <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => setDeleting(true)}>
              Delete
            </button>
          </div>
        )}
      </header>

      <div className={isNew ? '' : 'form-layout'}>
        <form className="panel form-panel" onSubmit={submit} noValidate>
          <fieldset className="form-section">
            <legend>Details</legend>
            <div className="grid-2">
              <Field
                label="Name"
                value={form.name}
                onChange={update('name')}
                error={errors.name}
                maxLength={200}
                autoFocus={isNew}
                required
              />
              <Field
                label="SKU"
                value={form.sku}
                onChange={update('sku')}
                error={errors.sku}
                hint="Unique within your organization."
                className="mono-input"
                maxLength={64}
                required
              />
            </div>
            <Field
              as="textarea"
              label="Description"
              optional
              rows={3}
              value={form.description}
              onChange={update('description')}
              error={errors.description}
              maxLength={2000}
            />
          </fieldset>

          <fieldset className="form-section">
            <legend>Stock</legend>
            <div className="grid-2">
              <Field
                label="Quantity on hand"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.quantityOnHand}
                onChange={update('quantityOnHand')}
                error={errors.quantityOnHand}
                required
              />
              <Field
                label="Low stock threshold"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                optional
                placeholder={`Default: ${defaultThreshold}`}
                value={form.lowStockThreshold}
                onChange={update('lowStockThreshold')}
                error={errors.lowStockThreshold}
                hint={`Leave empty to use the default (${defaultThreshold}).`}
              />
            </div>
          </fieldset>

          <fieldset className="form-section">
            <legend>Pricing</legend>
            <div className="grid-2">
              <Field
                label="Cost price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                optional
                placeholder="0.00"
                value={form.costPrice}
                onChange={update('costPrice')}
                error={errors.costPrice}
              />
              <Field
                label="Selling price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                optional
                placeholder="0.00"
                value={form.sellingPrice}
                onChange={update('sellingPrice')}
                error={errors.sellingPrice}
              />
            </div>
          </fieldset>

          {errors.form && (
            <p className="form-error" role="alert">
              {errors.form}
            </p>
          )}
          <div className="form-actions">
            <Link to="/products" className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}
            </button>
          </div>
        </form>

        {!isNew && (
          <aside className="panel meta-panel" aria-label="Product summary">
            <h2>Summary</h2>
            <dl className="meta-list">
              <div>
                <dt>Status</dt>
                <dd>
                  <StockBadge quantity={product.quantityOnHand} threshold={product.effectiveThreshold} />
                </dd>
              </div>
              <div>
                <dt>On hand</dt>
                <dd>{product.quantityOnHand} units</dd>
              </div>
              <div>
                <dt>Threshold</dt>
                <dd>
                  {product.effectiveThreshold}
                  {product.lowStockThreshold === null && <span className="tag">default</span>}
                </dd>
              </div>
              <div>
                <dt>Margin</dt>
                <dd>
                  {product.costPrice !== null && product.sellingPrice !== null
                    ? formatMoney(product.sellingPrice - product.costPrice)
                    : '—'}
                </dd>
              </div>
              {product.lastStockNote && (
                <div>
                  <dt>Last stock note</dt>
                  <dd>{product.lastStockNote}</dd>
                </div>
              )}
              <div>
                <dt>Last updated</dt>
                <dd>
                  {formatDate(product.updatedAt)}
                  {product.lastUpdatedBy && <span className="meta-sub">by {product.lastUpdatedBy}</span>}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(product.createdAt)}</dd>
              </div>
            </dl>
          </aside>
        )}
      </div>

      {!isNew && (
        <>
          <AdjustStockDialog
            product={adjusting ? product : null}
            onClose={() => setAdjusting(false)}
            onSaved={(updated) => {
              setProduct(updated);
              setForm((f) => ({ ...f, quantityOnHand: String(updated.quantityOnHand) }));
              setAdjusting(false);
              notify(`${updated.name} now has ${updated.quantityOnHand} units.`);
            }}
          />
          <ConfirmDialog
            open={deleting}
            title="Delete product?"
            message={
              <>
                <strong>{product.name}</strong> ({product.sku}) will be permanently removed. This
                can't be undone.
              </>
            }
            onConfirm={confirmDelete}
            onClose={() => setDeleting(false)}
          />
        </>
      )}
    </>
  );
}

function BackLink() {
  return (
    <Link to="/products" className="back-link">
      ← Back to products
    </Link>
  );
}
