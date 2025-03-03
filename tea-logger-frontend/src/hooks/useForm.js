// src/hooks/useForm.js - Complete rewrite with stable update pattern
import { useState, useCallback, useRef } from 'react';

export function useForm(initialValues, validationSchema = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(Object.keys(validationSchema).length === 0);
  
  // Use refs to track previous values and validation state
  const isValidatingRef = useRef(false);
  const lastValuesRef = useRef(values);
  
  // Helper function to validate a single field - not a hook dependency
  const validateField = (name, value) => {
    // No validation schema means field is valid
    if (!validationSchema[name]) {
      return { isValid: true };
    }
    
    const fieldSchema = validationSchema[name];
    let fieldIsValid = true;
    let errorMessage = '';
    
    // Required validation
    if (fieldSchema.required && 
        (value === undefined || value === null || value === '')) {
      fieldIsValid = false;
      errorMessage = fieldSchema.required.message || 'This field is required';
    }
    
    // Minimum length validation
    else if (fieldSchema.minLength && 
             value && 
             value.length < fieldSchema.minLength.value) {
      fieldIsValid = false;
      errorMessage = fieldSchema.minLength.message || 
                    `Must be at least ${fieldSchema.minLength.value} characters`;
    }
    
    // Maximum length validation
    else if (fieldSchema.maxLength && 
             value && 
             value.length > fieldSchema.maxLength.value) {
      fieldIsValid = false;
      errorMessage = fieldSchema.maxLength.message || 
                    `Must be at most ${fieldSchema.maxLength.value} characters`;
    }
    
    // Pattern validation
    else if (fieldSchema.pattern && 
             value && 
             !fieldSchema.pattern.regex.test(value)) {
      fieldIsValid = false;
      errorMessage = fieldSchema.pattern.message || 'Invalid format';
    }
    
    // Custom validation
    else if (fieldSchema.validate) {
      const customValid = fieldSchema.validate.validator(value, values);
      if (!customValid) {
        fieldIsValid = false;
        errorMessage = fieldSchema.validate.message || 'Invalid value';
      }
    }
    
    return {
      isValid: fieldIsValid,
      errorMessage: fieldIsValid ? undefined : errorMessage
    };
  };

  // Update form values
  const setFormValues = useCallback((newValues) => {
    // Update values
    setValues(newValues);
    // Set last values ref
    lastValuesRef.current = newValues;
  }, []);

  // Reset form to initial values
  const reset = useCallback((newValues = initialValues) => {
    setFormValues(newValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
    lastValuesRef.current = newValues;
  }, [initialValues, setFormValues]);

  // Set a single value
  const setValue = useCallback((name, value) => {
    // Update only this field
    setValues(prev => {
      const updated = { ...prev, [name]: value };
      lastValuesRef.current = updated;
      return updated;
    });
    
    setIsDirty(true);
    
    // Validate the field if it was touched
    if (touched[name]) {
      const result = validateField(name, value);
      if (!result.isValid) {
        setErrors(prev => ({ ...prev, [name]: result.errorMessage }));
      } else {
        setErrors(prev => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      }
    }
  }, [touched]);

  // Handle form input changes
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    
    // Update the value
    setValue(name, inputValue);
    
    // Mark as touched
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }));
    }
  }, [setValue, touched]);

  // Handle field blur event
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    
    // Mark as touched
    if (!touched[name]) {
      setTouched(prev => ({ ...prev, [name]: true }));
    }
    
    // Validate on blur
    if (validationSchema[name]) {
      const result = validateField(name, values[name]);
      if (!result.isValid) {
        setErrors(prev => ({ ...prev, [name]: result.errorMessage }));
      } else {
        setErrors(prev => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      }
    }
  }, [values, validationSchema, touched]);

  // Validate all form fields
  const validateForm = useCallback(() => {
    if (isValidatingRef.current) return true;
    
    isValidatingRef.current = true;
    
    let formIsValid = true;
    const newErrors = {};
    
    // Mark all fields as touched
    const allTouched = Object.keys(validationSchema).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Validate all fields
    Object.keys(validationSchema).forEach(name => {
      const result = validateField(name, values[name]);
      if (!result.isValid) {
        formIsValid = false;
        newErrors[name] = result.errorMessage;
      }
    });
    
    setErrors(newErrors);
    setIsValid(formIsValid);
    
    isValidatingRef.current = false;
    return formIsValid;
  }, [values, validationSchema]);

  // Handle form submission
  const handleSubmit = useCallback((submitFn) => {
    return async (e) => {
      if (e) e.preventDefault();
      
      setIsSubmitting(true);
      
      // Validate all fields
      const isFormValid = validateForm();
      
      if (isFormValid) {
        try {
          await submitFn(values);
        } catch (error) {
          console.error('Form submission error:', error);
          
          // Handle field errors
          if (error.fieldErrors) {
            setErrors(prev => ({ ...prev, ...error.fieldErrors }));
          }
        }
      }
      
      setIsSubmitting(false);
    };
  }, [values, validateForm]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValue,
    setValues: setFormValues,
    validateForm,
    isSubmitting,
    isDirty,
    isValid
  };
}