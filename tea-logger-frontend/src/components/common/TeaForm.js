// src/components/common/TeaForm.js - Enhanced with form validation
import React, { useEffect } from 'react';
import { useForm } from '../../hooks/useForm';
import { 
  TextField, 
  SelectField, 
  TextAreaField,
  SubmitButton 
} from './FormFields';

const TeaForm = React.memo(({ 
  tea, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  // Validation schema
  const validationSchema = {
    name: {
      required: { message: 'Tea name is required' },
      minLength: { value: 1, message: 'Name must not be empty' }
    }
  };
  
  // Tea type options
  const teaTypeOptions = [
    { value: '', label: 'Select a type' },
    { value: 'White', label: 'White' },
    { value: 'Green', label: 'Green' },
    { value: 'Yellow', label: 'Yellow' },
    { value: 'Oolong', label: 'Oolong' },
    { value: 'Black', label: 'Black' },
    { value: 'Sheng Puer', label: 'Sheng Puer' },
    { value: 'Shu Puer', label: 'Shu Puer' },
    { value: 'Herbal', label: 'Herbal' },
    { value: 'Other', label: 'Other' }
  ];
  
  // Initialize form with the provided tea data
  const { 
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isDirty,
    isValid,
    setValues
  } = useForm(tea, validationSchema);
  
  // Update form values when tea prop changes
  useEffect(() => {
    setValues(tea);
  }, [tea, setValues]);
  
  // Handle form submission
  const submitForm = async (formData) => {
    await onSave(formData);
  };
  
  return (
    <div className="tea-form">
      <h3 className="form-title">
        {isEditing ? 'Edit Tea' : 'Add New Tea'}
      </h3>
      
      <form onSubmit={handleSubmit(submitForm)}>
        <TextField
          label="Tea Name"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.name}
          touched={touched.name}
          required
          placeholder="Enter tea name"
        />
        
        <SelectField
          label="Tea Type"
          name="type"
          value={values.type}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.type}
          touched={touched.type}
          options={teaTypeOptions}
          helpText="Select the type of tea"
        />
        
        <TextField
          label="Vendor"
          name="vendor"
          value={values.vendor}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.vendor}
          touched={touched.vendor}
          placeholder="Tea vendor/producer"
        />
        
        <TextField
          label="Year/Age"
          name="year"
          value={values.year}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.year}
          touched={touched.year}
          placeholder="Production year or age"
          helpText="e.g., 2019, 15 years, etc."
        />
        
        <TextAreaField
          label="Notes"
          name="notes"
          value={values.notes}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.notes}
          touched={touched.notes}
          placeholder="Additional notes about this tea"
          rows={3}
        />
        
        <div className="form-actions">
          <button 
            type="button"
            className="cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          
          <SubmitButton
            isSubmitting={isSubmitting}
            isValid={isValid}
            isDirty={isDirty}
          >
            {isEditing ? 'Update Tea' : 'Add Tea'}
          </SubmitButton>
        </div>
      </form>
    </div>
  );
});

export default TeaForm;