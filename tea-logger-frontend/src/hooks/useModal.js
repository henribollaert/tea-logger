// src/hooks/useModal.js
import { useState, useCallback } from 'react';

export function useModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalData, setModalData] = useState(null);
  
  const openModal = useCallback((data = null) => {
    setModalData(data);
    setIsOpen(true);
  }, []);
  
  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Clear data after animation would complete
    setTimeout(() => {
      setModalData(null);
    }, 300);
  }, []);
  
  return {
    isOpen,
    modalData,
    openModal,
    closeModal
  };
}