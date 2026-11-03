import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import Field from '../components/Field.jsx';
import { ErrorState, LoadingState } from './states.jsx';

export default function Settings() {
  const { setUser } = useAuth();
  const notify = useToast();
  const [settings, setSettings] = useState(null);
  const [threshold, setThreshold] = useState('');
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoadError(null);
    api
      .getSettings()
      .then(({ settings }) => {
        setSettings(settings);
        setThreshold(String(settings.defaultLowStockThreshold));
      })
      .catch(setLoadError);
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const { settings: saved } = await api.updateSettings({ defaultLowStockThreshold: threshold });
      setSettings(saved);
      setUser((u) => ({ ...u, defaultLowStockThreshold: saved.defaultLowStockThreshold }));
      notify('Settings saved.');
    } catch (err) {
      setErrors({ ...err.fields, form: err.fields ? null : err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <ErrorState error={loadError} onRetry={load} />;
  if (!settings) return <LoadingState />;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="muted">Preferences for {settings.organizationName}.</p>
        </div>
      </header>

      <form className="panel form-panel settings-panel" onSubmit={submit} noValidate>
        <fieldset className="form-section">
          <legend>Inventory</legend>
          <Field
            label="Default low stock threshold"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            error={errors.defaultLowStockThreshold}
            hint="Used for any product without its own threshold. A product is low stock when its quantity is at or below this number."
            required
          />
        </fieldset>
        {errors.form && (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        )}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </>
  );
}
