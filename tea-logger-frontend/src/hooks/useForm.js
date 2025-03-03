// src/hooks/useForm.js
import { useState, useCallback, useEffect } from 'react';

export function useForm(initialValues, validationSchema = {}) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(Object.keys(validationSchema).length === 0);

  // Reset form to initial values
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  // Set values programmatically
  const setValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
  }, []);

  // Handle change for any input
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    setIsDirty(true);
  }, []);

  // Handle blur event for any input
  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validate field on blur
    if (validationSchema[name]) {
      validateField(name, values[name]);
    }
  }, [values, validationSchema]);

  // Validate a single field
  const validateField = useCallback((name, value) => {
    if (!validationSchema[name]) return true;
    
    const fieldSchema = validationSchema[name];
    let isValid = true;
    let errorMessage = '';
    
    // Required validation
    if (fieldSchema.required && 
        (value === undefined || value === null || value === '')) {
      isValid = false;
      errorMessage = fieldSchema.required.message || 'This field is required';
    }
    
    // Minimum length validation
    else if (fieldSchema.minLength && 
             value && 
             value.length < fieldSchema.minLength.value) {
      isValid = false;
      errorMessage = fieldSchema.minLength.message || 
                    `Must be at least ${fieldSchema.minLength.value} characters`;
    }
    
    // Maximum length validation
    else if (fieldSchema.maxLength && 
             value && 
             value.length > fieldSchema.maxLength.value) {
      isValid = false;
      errorMessage = fieldSchema.maxLength.message || 
                    `Must be at most ${fieldSchema.maxLength.value} characters`;
    }
    
    // Pattern validation
    else if (fieldSchema.pattern && 
             value && 
             !fieldSchema.pattern.regex.test(value)) {
      isValid = false;
      errorMessage = fieldSchema.pattern.message || 'Invalid format';
    }
    
    // Custom validation
    else if (fieldSchema.validate) {
      const customValid = fieldSchema.validate.validator(value, values);
      if (!customValid) {
        isValid = false;
        errorMessage = fieldSchema.validate.message || 'Invalid value';
      }
    }
    
    // Update errors
    setErrors(prev => ({
      ...prev,
      [name]: isValid ? undefined : errorMessage
    }));
    
    return isValid;
  }, [values, validationSchema]);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let formIsValid = true;
    
    // Mark all fields as touched
    const allTouched = Object.keys(validationSchema).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {});
    
    setTouched(allTouched);
    
    // Validate each field
    Object.keys(validationSchema).forEach(fieldName => {
      const isFieldValid = validateField(fieldName, values[fieldName]);
      if (!isFieldValid) {
        formIsValid = false;
        newErrors[fieldName] = errors[fieldName]; // Preserve existing error message
      }
    });
    
    setErrors(newErrors);
    setIsValid(formIsValid);
    
    return formIsValid;
  }, [values, errors, validationSchema, validateField]);

  // Handle form submission
  const handleSubmit = useCallback((submitFn) => {
    return async (e) => {
      if (e) e.preventDefault();
      
      setIsSubmitting(true);
      
      const isValid = validateForm();
      
      if (isValid) {
        try {
          await submitFn(values);
        } catch (error) {
          console.error('Form submission error:', error);
          
          // If the error has field-specific errors, set them
          if (error.fieldErrors) {
            setErrors(prev => ({
              ...prev,
              ...error.fieldErrors
            }));
          }
        }
      }
      
      setIsSubmitting(false);
    };
  }, [values, validateForm]);

  // Re-validate form when values change and we have validation rules
  useEffect(() => {
    if (Object.keys(validationSchema).length > 0 && isDirty) {
      // Only validate touched fields
      const touchedFields = Object.keys(touched).filter(key => touched[key]);
      
      let formIsValid = true;
      const newErrors = { ...errors };
      
      touchedFields.forEach(fieldName => {
        if (validationSchema[fieldName]) {
          const isFieldValid = validateField(fieldName, values[fieldName]);
          if (!isFieldValid) {
            formIsValid = false;
          }
        }
      });
      
      setIsValid(formIsValid);
    }
  }, [values, touched, isDirty, errors, validationSchema, validateField]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValue,
    setValues,
    validateForm,
    validateField,
    isSubmitting,
    isDirty,
    isValid
  };
}

// Example validation schema:
// const validationSchema = {
//   name: {
//     required: { message: 'Name is required' },
//     minLength: { value: 3, message: 'Name must be at least 3 characters' }
//   },
//   email: {
//     required: { message: 'Email is required' },
//     pattern: { 
//       regex: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
//       message: 'Invalid email address'
//     }
//   }
// };