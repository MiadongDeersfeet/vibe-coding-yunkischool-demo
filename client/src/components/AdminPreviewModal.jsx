import { useEffect } from "react";
import "./AdminPreviewModal.css";

function AdminPreviewModal({ open, title, imageUrl, fields, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-preview-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-preview-header">
          <h2 id="admin-preview-title">{title}</h2>
          <button
            type="button"
            className="admin-preview-close"
            onClick={onClose}
            aria-label="미리보기 닫기"
          >
            닫기
          </button>
        </div>

        {imageUrl ? (
          <div className="admin-preview-image-wrap">
            <img src={imageUrl} alt={`${title} 미리보기`} className="admin-preview-image" />
          </div>
        ) : null}

        <dl className="admin-preview-fields">
          {fields.map((field) => (
            <div key={field.label} className="admin-preview-field-row">
              <dt>{field.label}</dt>
              <dd>{field.value || "-"}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export default AdminPreviewModal;
