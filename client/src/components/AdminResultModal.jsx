import { useEffect } from "react";
import "./AdminResultModal.css";

function AdminResultModal({ open, title, message, variant = "success", confirmLabel = "확인", onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-result-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-result-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-result-modal-title"
        aria-describedby="admin-result-modal-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-result-modal-title" className={`admin-result-modal__title admin-result-modal__title--${variant}`}>
          {title}
        </h2>
        <p id="admin-result-modal-desc" className="admin-result-modal__message">
          {message}
        </p>
        <button type="button" className="admin-result-modal__btn" onClick={onClose}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export default AdminResultModal;
