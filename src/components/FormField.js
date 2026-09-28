import React, { forwardRef } from 'react';
import './FormField.css';

/**
 * Shared labeled form control (input or select) with inline validation support.
 *
 * - Renders a red border (via --danger) and a short message below the field
 *   whenever `error` is a non-empty string.
 * - `as="select"` renders a <select> instead of an <input>; pass <option>
 *   elements as children in that case.
 * - Forwards its ref to the underlying <input>/<select> so callers that need
 *   direct DOM access (e.g. Google Places autocomplete) keep working.
 */
const FormField = forwardRef(({
  label,
  id,
  error,
  required,
  as = 'input',
  wrapperClassName = '',
  className = '',
  children,
  ...rest
}, ref) => {
  const Tag = as;
  const controlClassName = ['form-field-control', className, error ? 'form-field-control-error' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['form-field', wrapperClassName].filter(Boolean).join(' ')}>
      {label && <label htmlFor={id}>{label}</label>}
      <Tag
        id={id}
        ref={ref}
        required={required}
        className={controlClassName}
        style={error ? { borderColor: 'var(--danger)' } : undefined}
        {...rest}
      >
        {children}
      </Tag>
      {error && <div className="form-field-error">{error}</div>}
    </div>
  );
});

FormField.displayName = 'FormField';

export default FormField;
