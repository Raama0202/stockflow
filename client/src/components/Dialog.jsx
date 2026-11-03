import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import Field from './Field.jsx';

function Dialog({ open, onClose, title, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          <h2 className="dialog-title">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="dialog-message">{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy} autoFocus>
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function AdjustStockDialog({ product, onClose, onSaved }) {
  const [delta, setDelta] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDelta('');
    setNote('');
    setErrors({});
  }, [product?.id]);

  const parsed = Number(delta);
  const preview =
    product && delta !== '' && Number.isInteger(parsed) ? product.quantityOnHand + parsed : null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { product: updated } = await api.adjustStock(product.id, { delta, note });
      onSaved(updated);
    } catch (err) {
      setErrors({ ...err.fields, form: err.fields?.delta ? null : err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={Boolean(product)} onClose={onClose} title="Adjust stock">
      {product && (
        <form onSubmit={submit} noValidate>
          <p className="dialog-message">
            <strong>{product.name}</strong> <span className="muted">({product.sku})</span> currently
            has <strong>{product.quantityOnHand}</strong> units on hand.
          </p>
          <Field
            label="Change in units"
            type="number"
            step="1"
            inputMode="numeric"
            placeholder="e.g. 25 or -3"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            error={errors.delta}
            hint={
              preview !== null
                ? `New quantity will be ${preview}.`
                : 'Use a positive number to add stock, negative to remove.'
            }
            autoFocus
            required
          />
          <div className="quick-adjust" role="group" aria-label="Quick adjustments">
            {[-10, -1, 1, 10].map((n) => (
              <button
                key={n}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDelta(String((Number(delta) || 0) + n))}
              >
                {n > 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
          <Field
            label="Note"
            optional
            placeholder="e.g. Received shipment #1042"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={errors.note}
          />
          {errors.form && <p className="form-error">{errors.form}</p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save adjustment'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
