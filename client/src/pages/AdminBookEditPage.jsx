import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders, jsonAuthHeaders } from "../api/authHeaders";
import { isAdminSession } from "../auth/adminAccess";
import AdminResultModal from "../components/AdminResultModal";
import AdminTopNav from "../components/AdminTopNav";
import "./AdminPage.css";

const initialForm = {
  title: "",
  subtitle: "",
  description: "",
  authorName: "",
  publisherName: "",
  publishDate: "",
  price: "",
  purchasable: true,
  imageUrl: "",
};

function toDateInputValue(value) {
  if (value == null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

function AdminBookEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resultModal, setResultModal] = useState({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });
  const [uploading, setUploading] = useState(false);
  const navigateAfterModalCloseRef = useRef(false);

  const closeResultModal = () => {
    setResultModal((prev) => ({ ...prev, open: false }));
    if (navigateAfterModalCloseRef.current) {
      navigateAfterModalCloseRef.current = false;
      navigate("/admin/books");
    }
  };

  const showResultModal = ({ message, variant = "success", title }) => {
    setResultModal({
      open: true,
      message,
      variant,
      title: title || (variant === "error" ? "알림" : "완료"),
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadBook = async () => {
      if (!isAdminSession()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/books/${id}`), { headers: bearerAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "도서 정보를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setForm({
            title: data.title || "",
            subtitle: data.subtitle || "",
            description: data.description || "",
            authorName: data.authorName || "",
            publisherName: data.publisherName || "",
            publishDate: toDateInputValue(data.publishDate),
            price: data.price != null ? String(data.price) : "",
            purchasable: data.purchasable !== false,
            imageUrl: data.imageUrl || "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          showResultModal({
            variant: "error",
            title: "불러오기 실패",
            message: error.message || "도서 정보를 불러오지 못했습니다.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadBook();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pageTitle = useMemo(() => (form.title ? `도서 수정 · ${form.title}` : "도서 수정"), [form.title]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (event) => {
    const { name, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const ensureCloudinaryScript = () =>
    new Promise((resolve, reject) => {
      if (window.cloudinary?.createUploadWidget) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-cloudinary-widget="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Cloudinary 스크립트 로드에 실패했습니다.")), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://widget.cloudinary.com/v2.0/global/all.js";
      script.async = true;
      script.dataset.cloudinaryWidget = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Cloudinary 스크립트 로드에 실패했습니다."));
      document.body.appendChild(script);
    });

  const openImageUploadWidget = async () => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      showResultModal({
        variant: "error",
        title: "이미지 업로드",
        message:
          "Cloudinary 설정이 없습니다. VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET을 추가해주세요.",
      });
      return;
    }
    setUploading(true);
    try {
      await ensureCloudinaryScript();
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: cloudinaryCloudName,
          uploadPreset: cloudinaryUploadPreset,
          sources: ["local", "url", "camera"],
          multiple: false,
          maxFiles: 1,
          resourceType: "image",
          folder: "noor-tour",
        },
        (error, result) => {
          if (error) {
            showResultModal({
              variant: "error",
              title: "이미지 업로드",
              message: "이미지 업로드 중 오류가 발생했습니다.",
            });
            setUploading(false);
            return;
          }
          if (result?.event === "close") {
            setUploading(false);
            return;
          }
          if (result?.event !== "success") return;
          const uploadedUrl = result.info?.secure_url || "";
          if (uploadedUrl) {
            setForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
          }
          setUploading(false);
        }
      );
      widget.open();
    } catch (error) {
      showResultModal({
        variant: "error",
        title: "이미지 업로드",
        message: error.message || "Cloudinary 위젯을 열 수 없습니다.",
      });
      setUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const body = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        description: form.description.trim(),
        authorName: form.authorName.trim(),
        publisherName: form.publisherName.trim(),
        publishDate: form.publishDate,
        price: Number(form.price),
        purchasable: form.purchasable,
        imageUrl: form.imageUrl.trim(),
      };

      const res = await fetch(apiUrl(`/api/books/${id}`), {
        method: "PUT",
        headers: jsonAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "도서 수정에 실패했습니다.");
      }

      navigateAfterModalCloseRef.current = true;
      showResultModal({
        variant: "success",
        title: "도서 수정 완료",
        message: "도서가 수정되었습니다. 확인을 누르면 목록으로 이동합니다.",
      });
    } catch (error) {
      showResultModal({
        variant: "error",
        title: "도서 수정 실패",
        message: error.message || "도서 수정에 실패했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("이 도서를 삭제할까요?")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/books/${id}`), {
        method: "DELETE",
        headers: bearerAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "삭제에 실패했습니다.");
      }
      navigate("/admin/books");
    } catch (error) {
      showResultModal({
        variant: "error",
        title: "삭제 실패",
        message: error.message || "삭제에 실패했습니다.",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdminSession()) {
    return (
      <div className="admin-page admin-page--gate">
        <AdminResultModal
          open
          title="접근 불가"
          message="관리자 권한이 없습니다. 확인을 누르면 메인 페이지로 이동합니다."
          variant="error"
          onClose={() => navigate("/", { replace: true })}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <p className="admin-list-empty">도서 정보를 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{pageTitle}</h1>
        <Link to="/admin/books" className="admin-home-link">
          목록으로 돌아가기
        </Link>
      </div>
      <AdminTopNav />

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          도서 제목
          <input name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>
          부제/언어
          <input name="subtitle" value={form.subtitle} onChange={handleChange} required />
        </label>
        <label>
          저자
          <input name="authorName" value={form.authorName} onChange={handleChange} required />
        </label>
        <label>
          출판사
          <input name="publisherName" value={form.publisherName} onChange={handleChange} required />
        </label>
        <label>
          출간일
          <input type="date" name="publishDate" value={form.publishDate} onChange={handleChange} required />
        </label>
        <label>
          가격 (원)
          <input type="number" name="price" min="0" value={form.price} onChange={handleChange} required />
        </label>
        <label>
          썸네일 이미지 URL
          <input type="url" name="imageUrl" value={form.imageUrl} onChange={handleChange} required />
        </label>
        <button type="button" className="admin-upload-btn" onClick={openImageUploadWidget} disabled={uploading}>
          {uploading ? "업로드 중..." : "Cloudinary에서 이미지 선택"}
        </button>
        {form.imageUrl ? (
          <div className="admin-image-preview-wrap">
            <img src={form.imageUrl} alt="도서 표지 미리보기" className="admin-image-preview" />
          </div>
        ) : null}
        <label>
          상세 설명
          <textarea name="description" rows="6" value={form.description} onChange={handleChange} required />
        </label>
        <label className="admin-checkbox-label">
          <input type="checkbox" name="purchasable" checked={form.purchasable} onChange={handleCheckbox} />
          구매 가능
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "저장 중…" : "수정 저장"}
        </button>
      </form>

      <div className="admin-edit-danger-zone">
        <button type="button" className="admin-delete-btn admin-delete-btn-wide" disabled={deleting} onClick={handleDelete}>
          {deleting ? "삭제 중…" : "이 도서 삭제"}
        </button>
      </div>

      <AdminResultModal
        open={resultModal.open}
        title={resultModal.title}
        message={resultModal.message}
        variant={resultModal.variant}
        onClose={closeResultModal}
      />
    </div>
  );
}

export default AdminBookEditPage;
