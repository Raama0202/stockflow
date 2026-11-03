import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="state">
      <h1>Page not found</h1>
      <p className="muted">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">
        Go to dashboard
      </Link>
    </div>
  );
}
