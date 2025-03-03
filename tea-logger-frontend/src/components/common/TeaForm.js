// src/components/common/TeaForm.js
import React from 'react';

const TeaForm = React.memo(({ 
  tea, 
  onChange, 
  onSave, 
  onCancel, 
  isEditing = false 
}) => {
  return (
    <div className="tea-form">
      <h3 className="form-title">
        {isEditing ? 'Edit Tea' : 'Add New Tea'}
      </h3>
      
      <div className="form-group">
        <label htmlFor="name">Tea Name*</label>
        <input
          type="text"
          id="name"
          name="name"
          value={tea.name}
          onChange={onChange}
          className="form-input"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="type">Tea Type</label>
        <select
          id="type"
          name="type"
          value={tea.type}
          onChange={onChange}
          className="form-select"
        >
          <option value="">Select a type</option>
          <option value="White">White</option>
          <option value="Green">Green</option>
          <option value="Yellow">Yellow</option>
          <option value="Oolong">Oolong</option>
          <option value="Black">Black</option>
          <option value="Sheng Puer">Sheng Puer</option>
          <option value="Shu Puer">Shu Puer</option>
          <option value="Herbal">Herbal</option>
          <option value="Other">Other</option>
        </select>
      </div>
      
      <div className="form-group">
        <label htmlFor="vendor">Vendor</label>
        <input
          type="text"
          id="vendor"
          name="vendor"
          value={tea.vendor}
          onChange={onChange}
          className="form-input"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="year">Year/Age</label>
        <input
          type="text"
          id="year"
          name="year"
          value={tea.year}
          onChange={onChange}
          className="form-input"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          value={tea.notes}
          onChange={onChange}
          className="form-textarea"
          rows="3"
        ></textarea>
      </div>
      
      <div className="form-actions">
        <button 
          className="cancel-button"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          className="save-button"
          onClick={onSave}
          disabled={!tea.name.trim()}
        >
          {isEditing ? 'Update Tea' : 'Add Tea'}
        </button>
      </div>
    </div>
  );
});

export default TeaForm;