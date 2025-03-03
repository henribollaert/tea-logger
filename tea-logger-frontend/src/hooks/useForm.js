// src/hooks/useForm.js
import { useState, useCallback } from 'react';

export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
    
    // Mark field as touched
    if (!touched[name]) {
      setTouched(prev => ({
        ...prev,
        [name]: true
      }));
    }
  }, [errors, touched]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  const validate = useCallback((validationRules) => {
    const newErrors = {};
    let isValid = true;
    
    Object.keys(validationRules).forEach(fieldName => {
      const value = values[fieldName];
      const rules = validationRules[fieldName];
      
      if (rules.required && !value) {
        newErrors[fieldName] = rules.required;
        isValid = false;
      } else if (rules.pattern && value && !rules.pattern.regex.test(value)) {
        newErrors[fieldName] = rules.pattern.message;
        isValid = false;
      } else if (rules.minLength && value && value.length < rules.minLength.value) {
        newErrors[fieldName] = rules.minLength.message;
        isValid = false;
      } else if (rules.custom && !rules.custom.validator(value, values)) {
        newErrors[fieldName] = rules.custom.message;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {}));
    
    return isValid;
  }, [values]);
  
  return {
    values,
    errors,
    touched,
    handleChange,
    reset,
    validate,
    setValues
  };
}