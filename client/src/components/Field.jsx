import { useId } from 'react';

export default function Field({ label, error, hint, optional, className = '', ...inputProps }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const Input = inputProps.as === 'textarea' ? 'textarea' : 'input';
  const { as: _as, ...rest } = inputProps;

  return (
    <div className={`field ${error ? 'field-invalid' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="optional">Optional</span>}
      </label>
      <Input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy} {...rest} />
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
