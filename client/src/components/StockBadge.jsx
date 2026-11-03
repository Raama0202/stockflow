export default function StockBadge({ quantity, threshold }) {
  if (quantity === 0) return <span className="badge badge-danger">Out of stock</span>;
  if (quantity <= threshold) return <span className="badge badge-warning">Low stock</span>;
  return <span className="badge badge-ok">In stock</span>;
}
