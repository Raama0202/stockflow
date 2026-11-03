import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Field from '../components/Field.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(null);
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    api
      .demoInfo()
      .then((info) => info.enabled && setDemo(info))
      .catch(() => {});
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const run = async (kind, action) => {
    setBusy(kind);
    setErrors({});
    try {
      await action();
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setErrors({ ...err.fields, form: err.fields ? null : err.message });
      setBusy(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    run('login', () => login(form));
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to manage your inventory."
      footer={
        <>
          New to StockFlow? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      {demo && (
        <div className="demo-box">
          <div>
            <p className="demo-title">Try the demo account</p>
            <p className="demo-creds">
              <span className="mono">{demo.email}</span>
              <span className="muted"> / </span>
              <span className="mono">{demo.password}</span>
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => run('demo', demoLogin)}
            disabled={Boolean(busy)}
          >
            {busy === 'demo' ? 'Opening demo…' : 'Log in as demo user'}
          </button>
        </div>
      )}

      <form onSubmit={submit} noValidate className="stack">
        {demo && <p className="divider">or log in with your account</p>}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          required
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
        />
        {errors.form && (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        )}
        <button
          type="submit"
          className={`btn btn-block btn-lg ${demo ? 'btn-secondary' : 'btn-primary'}`}
          disabled={Boolean(busy)}
        >
          {busy === 'login' ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
