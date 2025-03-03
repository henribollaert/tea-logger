// src/components/common/ConfirmationModal.js
import React from 'react';

const ConfirmationModal = React.memo(({ 
  title, 
  message, 
  confirmLabel = 'Delete', 
  cancelLabel = 'Cancel', 
  onConfirm, 
  onCancel, 
  isProcessing = false 
}) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-container">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button 
            className="cancel-button"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>
          <button 
            className={`${confirmLabel.toLowerCase()}-button`}
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? `${confirmLabel}...` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ConfirmationModal;