import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import Field from '../components/Field.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await login(form);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setErrors({ ...err.fields, form: err.fields ? null : err.message });
      setBusy(false);
    }
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
      <form onSubmit={submit} noValidate className="stack">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          autoFocus
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
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  );
}
