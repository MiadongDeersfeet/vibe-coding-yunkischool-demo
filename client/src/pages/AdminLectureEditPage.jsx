import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders, jsonAuthHeaders } from "../api/authHeaders";
import { isAdminSession } from "../auth/adminAccess";
import AdminResultModal from "../components/AdminResultModal";
import "./AdminPage.css";

const initialForm = {
  title: "",
  instructorName: "",
  price: "",
  imageUrl: "",
  shortDescription: "",
  description: "",
  languageKey: "kr",
  categoryName: "",
  categoryId: "",
  isActive: true,
};

const languageOptions = [
  { value: "kr", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "ar", label: "아랍어" },
  { value: "he", label: "히브리어" },
];

function AdminLectureEditPage() {
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
  const navigateAfterModalCloseRef = useRef(false);

  const closeResultModal = () => {
    setResultModal((prev) => ({ ...prev, open: false }));
    if (navigateAfterModalCloseRef.current) {
      navigateAfterModalCloseRef.current = false;
      navigate("/admin");
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

    const loadLecture = async () => {
      if (!isAdminSession()) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/lectures/${id}`), { headers: bearerAuthHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "강의 정보를 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setForm({
            title: data.title || "",
            instructorName: data.instructorName || "",
            price: data.price != null ? String(data.price) : "",
            imageUrl: data.imageUrl || "",
            shortDescription: data.shortDescription || "",
            description: data.description || "",
            languageKey: data.languageKey || "kr",
            categoryName: data.categoryName || "",
            categoryId: data.categoryId ? String(data.categoryId) : "",
            isActive: data.isActive !== false,
          });
        }
      } catch (error) {
        if (!cancelled) {
          showResultModal({
            variant: "error",
            title: "불러오기 실패",
            message: error.message || "강의 정보를 불러오지 못했습니다.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLecture();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const pageTitle = useMemo(() => (form.title ? `강의 수정 · ${form.title}` : "강의 수정"), [form.title]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (event) => {
    const { name, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const body = {
        title: form.title.trim(),
        instructorName: form.instructorName.trim(),
        price: Number(form.price),
        imageUrl: form.imageUrl.trim(),
        shortDescription: form.shortDescription.trim(),
        description: form.description.trim(),
        languageKey: form.languageKey,
        categoryName: form.categoryName.trim() || "미분류",
        isActive: form.isActive,
      };

      const categoryId = form.categoryId.trim();
      if (categoryId) {
        body.categoryId = categoryId;
      }

      const res = await fetch(apiUrl(`/api/lectures/${id}`), {
        method: "PUT",
        headers: jsonAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "강의 수정에 실패했습니다.");
      }

      navigateAfterModalCloseRef.current = true;
      showResultModal({
        variant: "success",
        title: "강의 수정 완료",
        message: "강의가 수정되었습니다. 확인을 누르면 목록으로 이동합니다.",
      });
    } catch (error) {
      showResultModal({
        variant: "error",
        title: "강의 수정 실패",
        message: error.message || "강의 수정에 실패했습니다.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("이 강의를 삭제할까요?")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(apiUrl(`/api/lectures/${id}`), {
        method: "DELETE",
        headers: bearerAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "삭제에 실패했습니다.");
      }
      navigate("/admin");
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
        <p className="admin-list-empty">강의 정보를 불러오는 중…</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{pageTitle}</h1>
        <Link to="/admin" className="admin-home-link">
          목록으로 돌아가기
        </Link>
      </div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          강의 제목
          <input name="title" value={form.title} onChange={handleChange} required />
        </label>
        <label>
          강사명
          <input name="instructorName" value={form.instructorName} onChange={handleChange} required />
        </label>
        <label>
          언어(노출 구분)
          <select name="languageKey" value={form.languageKey} onChange={handleChange} required>
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          가격 (원)
          <input type="number" name="price" min="0" value={form.price} onChange={handleChange} required />
        </label>
        <label>
          썸네일 이미지 URL
          <input type="url" name="imageUrl" value={form.imageUrl} onChange={handleChange} required />
        </label>
        <label>
          짧은 소개
          <input name="shortDescription" value={form.shortDescription} onChange={handleChange} required />
        </label>
        <label>
          상세 설명
          <textarea name="description" rows="5" value={form.description} onChange={handleChange} required />
        </label>
        <label>
          카테고리 이름
          <input name="categoryName" value={form.categoryName} onChange={handleChange} />
        </label>
        <label>
          카테고리 ID (선택)
          <input name="categoryId" value={form.categoryId} onChange={handleChange} />
        </label>
        <label className="admin-checkbox-label">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleCheckbox} />
          판매 중
        </label>
        <button type="submit" disabled={saving}>
          {saving ? "저장 중…" : "수정 저장"}
        </button>
      </form>

      <div className="admin-edit-danger-zone">
        <button type="button" className="admin-delete-btn admin-delete-btn-wide" disabled={deleting} onClick={handleDelete}>
          {deleting ? "삭제 중…" : "이 강의 삭제"}
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

export default AdminLectureEditPage;
