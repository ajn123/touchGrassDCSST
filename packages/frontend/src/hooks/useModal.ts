import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showModal = useCallback((title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    showModal(title, message, 'success');
  }, [showModal]);

  const showError = useCallback((title: string, message: string) => {
    showModal(title, message, 'error');
  }, [showModal]);

  const showWarning = useCallback((title: string, message: string) => {
    showModal(title, message, 'warning');
  }, [showModal]);

  const showInfo = useCallback((title: string, message: string) => {
    showModal(title, message, 'info');
  }, [showModal]);

  return {
    modalState,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
