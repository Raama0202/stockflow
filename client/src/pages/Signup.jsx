import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import Field from '../components/Field.jsx';
import AuthLayout from './AuthLayout.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match.' });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      await signup(form);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors({ ...err.fields, form: err.fields ? null : err.message });
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up your organization in under a minute."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="stack">
        <Field
          label="Organization name"
          placeholder="e.g. My Test Store"
          autoComplete="organization"
          value={form.organizationName}
          onChange={update('organizationName')}
          error={errors.organizationName}
          autoFocus
          required
        />
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
          autoComplete="new-password"
          hint="At least 8 characters."
          value={form.password}
          onChange={update('password')}
          error={errors.password}
          required
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          required
        />
        {errors.form && (
          <p className="form-error" role="alert">
            {errors.form}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  );
}
