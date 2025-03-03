// src/components/common/TeaForm.js - Fixed infinite update loop
import React, { useEffect, useRef } from 'react';
import { useForm } from '../../hooks/useForm';
import { 
  TextField, 
  SelectField, 
  TextAreaField
} from './FormFields';

const TeaForm = React.memo(({ 
  tea, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  // Use a ref to track the previous tea object for proper comparison
  const prevTeaRef = useRef();
  
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
    setValues
  } = useForm(tea || {
    id: null,
    name: '',
    type: '',
    vendor: '',
    year: '',
    notes: ''
  }, validationSchema);
  
  // Update form values when tea prop changes - fixed to avoid infinite loop
  useEffect(() => {
    // Only check if the tea object reference changed
    if (tea && tea !== prevTeaRef.current) {
      console.log('Tea object reference changed, updating form values', tea);
      
      // Store the current tea object for next comparison
      prevTeaRef.current = tea;
      
      // Update form values
      setValues(tea);
    }
  }, [tea, setValues]); // Remove values from deps array
  
  // Handle form submission
  const submitForm = async (formData) => {
    console.log('Submitting tea form with data:', formData);
    
    // Preserve the original ID when editing
    const dataToSave = {
      ...formData
    };
    
    if (isEditing && tea?.id) {
      // Ensure the ID is included for updates
      dataToSave.id = tea.id;
    }
    
    // Log the data being saved
    console.log('Data being saved:', dataToSave);
    
    // Call the onSave callback
    await onSave(dataToSave);
  };
  
  // Prevent form submission if name is empty
  const isFormValid = values.name && values.name.trim().length > 0;
  
  return (
    <div className="tea-form">
      <h3 className="form-title">
        {isEditing ? 'Edit Tea' : 'Add New Tea'}
      </h3>
      
      <form onSubmit={handleSubmit(submitForm)}>
        <TextField
          label="Tea Name"
          name="name"
          value={values.name || ''}
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
          value={values.type || ''}
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
          value={values.vendor || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.vendor}
          touched={touched.vendor}
          placeholder="Tea vendor/producer"
        />
        
        <TextField
          label="Year/Age"
          name="year"
          value={values.year || ''}
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
          value={values.notes || ''}
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
          
          <button
            type="submit"
            className="save-button"
            disabled={isSubmitting || !isFormValid}
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Tea' : 'Add Tea'}
          </button>
        </div>
      </form>
    </div>
  );
});

export default TeaForm;