// src/components/common/FormFields.js
import React from 'react';
import './FormFields.css';

export const FormField = React.memo(({ 
  label, 
  name, 
  error, 
  touched,
  children,
  required = false,
  helpText
}) => {
  const showError = error && touched;
  
  return (
    <div className={`form-field ${showError ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={name} className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      
      {children}
      
      {helpText && !showError && (
        <div className="form-help-text">{helpText}</div>
      )}
      
      {showError && (
        <div className="form-error-message">{error}</div>
      )}
    </div>
  );
});

export const TextField = React.memo(({ 
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  type = 'text',
  required = false,
  helpText,
  ...rest
}) => {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
    >
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        type={type}
        className={`form-input ${error && touched ? 'input-error' : ''}`}
        {...rest}
      />
    </FormField>
  );
});

export const TextAreaField = React.memo(({ 
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  placeholder,
  rows = 4,
  required = false,
  helpText,
  ...rest
}) => {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
    >
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        rows={rows}
        className={`form-textarea ${error && touched ? 'input-error' : ''}`}
        {...rest}
      />
    </FormField>
  );
});

export const SelectField = React.memo(({ 
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  options = [],
  required = false,
  helpText,
  ...rest
}) => {
  return (
    <FormField
      label={label}
      name={name}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
    >
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`form-select ${error && touched ? 'input-error' : ''}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
});

export const CheckboxField = React.memo(({ 
  label,
  name,
  checked,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  helpText,
  ...rest
}) => {
  return (
    <div className={`form-field checkbox-field ${error && touched ? 'has-error' : ''}`}>
      <div className="checkbox-container">
        <input
          id={name}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          onBlur={onBlur}
          className={`form-checkbox ${error && touched ? 'input-error' : ''}`}
          {...rest}
        />
        <label htmlFor={name} className="checkbox-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      </div>
      
      {helpText && !error && (
        <div className="form-help-text">{helpText}</div>
      )}
      
      {error && touched && (
        <div className="form-error-message">{error}</div>
      )}
    </div>
  );
});

export const SubmitButton = React.memo(({ 
  children,
  isSubmitting,
  isValid,
  isDirty,
  className = '',
  ...rest
}) => {
  // Button is disabled if form is submitting, or if it's invalid and has been touched
  const isDisabled = isSubmitting || (isDirty && !isValid);
  
  return (
    <button
      type="submit"
      className={`submit-button ${isSubmitting ? 'is-submitting' : ''} ${className}`}
      disabled={isDisabled}
      {...rest}
    >
      {isSubmitting ? 'Submitting...' : children}
    </button>
  );
});