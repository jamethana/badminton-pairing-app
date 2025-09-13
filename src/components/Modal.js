import React from 'react';
import { createPortal } from 'react-dom';

const Modal = ({ children, isOpen, onClose, className = '' }) => {
  if (!isOpen) return null;

  // Create portal to render modal at document root level
  return createPortal(
    <div 
      className={`modal-overlay portal-modal-overlay flex-center ${className}`} 
      onClick={onClose}
    >
      {children}
    </div>,
    document.body
  );
};

export default Modal;
