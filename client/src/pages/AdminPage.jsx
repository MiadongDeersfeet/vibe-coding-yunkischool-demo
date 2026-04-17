import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { jsonAuthHeaders } from "../api/authHeaders";
import { isAdminSession } from "../auth/adminAccess";
import AdminResultModal from "../components/AdminResultModal";
import AdminTopNav from "../components/AdminTopNav";
import "./AdminPage.css";

const initialLectureForm = {
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

const initialBookForm = {
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

const languageOptions = [
  { value: "kr", label: "한국어" },
  { value: "en", label: "영어" },
  { value: "ar", label: "아랍어" },
  { value: "he", label: "히브리어" },
];

const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

function AdminPage({ defaultCategory = "lecture" }) {
  const navigate = useNavigate();
  const [lectureForm, setLectureForm] = useState(initialLectureForm);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [resultModal, setResultModal] = useState({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState("");
  const activeCategory = useMemo(
    () => (defaultCategory === "book" ? "book" : "lecture"),
    [defaultCategory]
  );

  const closeResultModal = () => setResultModal((prev) => ({ ...prev, open: false }));

  const showResultModal = ({ message, variant = "success", title }) => {
    setResultModal({
      open: true,
      message,
      variant,
      title: title || (variant === "error" ? "알림" : "완료"),
    });
  };

  const handleLectureChange = (event) => {
    const { name, value } = event.target;
    setLectureForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLectureCheckbox = (event) => {
    const { name, checked } = event.target;
    setLectureForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleBookChange = (event) => {
    const { name, value } = event.target;
    setBookForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBookCheckbox = (event) => {
    const { name, checked } = event.target;
    setBookForm((prev) => ({ ...prev, [name]: checked }));
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

  const openImageUploadWidget = async (target) => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      showResultModal({
        variant: "error",
        title: "이미지 업로드",
        message:
          "Cloudinary 설정이 없습니다. VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET을 추가해주세요.",
      });
      return;
    }
    setUploadingTarget(target);
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
            setUploadingTarget("");
            return;
          }
          if (result?.event === "close") {
            setUploadingTarget("");
            return;
          }
          if (result?.event !== "success") return;
          const uploadedUrl = result.info?.secure_url || "";
          if (!uploadedUrl) {
            setUploadingTarget("");
            return;
          }
          if (target === "lecture") {
            setLectureForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
          } else {
            setBookForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
          }
          setUploadingTarget("");
        }
      );
      widget.open();
    } catch (error) {
      showResultModal({
        variant: "error",
        title: "이미지 업로드",
        message: error.message || "Cloudinary 위젯을 열 수 없습니다.",
      });
      setUploadingTarget("");
    }
  };

  const handleLectureSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        title: lectureForm.title.trim(),
        instructorName: lectureForm.instructorName.trim(),
        price: Number(lectureForm.price),
        imageUrl: lectureForm.imageUrl.trim(),
        shortDescription: lectureForm.shortDescription.trim(),
        description: lectureForm.description.trim(),
        languageKey: lectureForm.languageKey,
        isActive: lectureForm.isActive,
      };

      const catName = lectureForm.categoryName.trim();
      if (catName) {
        body.categoryName = catName;
      }

      const catId = lectureForm.categoryId.trim();
      if (catId) {
        body.categoryId = catId;
      }

      const res = await fetch(apiUrl("/api/lectures"), {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "등록에 실패했습니다.");
      }

      showResultModal({
        variant: "success",
        title: "강의 등록 완료",
        message: "강의가 등록되었습니다.",
      });
      setLectureForm(initialLectureForm);
    } catch (err) {
      showResultModal({
        variant: "error",
        title: "강의 등록 실패",
        message: err.message || "등록에 실패했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBookSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        title: bookForm.title.trim(),
        subtitle: bookForm.subtitle.trim(),
        description: bookForm.description.trim(),
        authorName: bookForm.authorName.trim(),
        publisherName: bookForm.publisherName.trim(),
        publishDate: bookForm.publishDate,
        price: Number(bookForm.price),
        purchasable: bookForm.purchasable,
        imageUrl: bookForm.imageUrl.trim(),
      };

      const res = await fetch(apiUrl("/api/books"), {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "도서 등록에 실패했습니다.");
      }

      showResultModal({
        variant: "success",
        title: "도서 등록 완료",
        message: "도서가 등록되었습니다.",
      });
      setBookForm(initialBookForm);
    } catch (err) {
      showResultModal({
        variant: "error",
        title: "도서 등록 실패",
        message: err.message || "도서 등록에 실패했습니다.",
      });
    } finally {
      setSubmitting(false);
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

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{activeCategory === "lecture" ? "강의 등록" : "도서 등록"}</h1>
      </div>
      <AdminTopNav />

      {activeCategory === "lecture" ? (
        <form className="admin-form" onSubmit={handleLectureSubmit}>
          <label>
            강의 제목
            <input name="title" value={lectureForm.title} onChange={handleLectureChange} placeholder="한국어 입문 1" required />
          </label>

          <label>
            강사명
            <input name="instructorName" value={lectureForm.instructorName} onChange={handleLectureChange} placeholder="홍길동" required />
          </label>

          <label>
            언어(노출 구분)
            <select name="languageKey" value={lectureForm.languageKey} onChange={handleLectureChange} required>
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            가격 (원)
            <input type="number" name="price" min="0" value={lectureForm.price} onChange={handleLectureChange} placeholder="39000" required />
          </label>

          <label>
            썸네일 이미지 URL
            <input type="url" name="imageUrl" value={lectureForm.imageUrl} onChange={handleLectureChange} placeholder="https://..." required />
          </label>
          <button
            type="button"
            className="admin-upload-btn"
            onClick={() => openImageUploadWidget("lecture")}
            disabled={uploadingTarget === "lecture"}
          >
            {uploadingTarget === "lecture" ? "업로드 중..." : "Cloudinary에서 이미지 선택"}
          </button>
          {lectureForm.imageUrl ? (
            <div className="admin-image-preview-wrap">
              <img src={lectureForm.imageUrl} alt="강의 썸네일 미리보기" className="admin-image-preview" />
            </div>
          ) : null}

          <label>
            짧은 소개
            <input name="shortDescription" value={lectureForm.shortDescription} onChange={handleLectureChange} placeholder="한 줄 요약" required />
          </label>

          <label>
            상세 설명
            <textarea name="description" rows="5" value={lectureForm.description} onChange={handleLectureChange} placeholder="강의 상세 내용" required />
          </label>

          <label>
            카테고리 이름
            <input name="categoryName" value={lectureForm.categoryName} onChange={handleLectureChange} placeholder="한국어 입문" />
          </label>

          <label>
            카테고리 ID (자동생성)
            <input name="categoryId" value={lectureForm.categoryId} onChange={handleLectureChange} placeholder="674a1b2c3d4e5f6789012345" />
          </label>

          <label className="admin-checkbox-label">
            <input type="checkbox" name="isActive" checked={lectureForm.isActive} onChange={handleLectureCheckbox} />
            판매 중
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "등록 중..." : "강의 등록"}
          </button>
        </form>
      ) : (
        <form className="admin-form" onSubmit={handleBookSubmit}>
          <label>
            도서 제목
            <input name="title" value={bookForm.title} onChange={handleBookChange} placeholder="마르하반! 기초 아랍어" required />
          </label>

          <label>
            부제/언어
            <input name="subtitle" value={bookForm.subtitle} onChange={handleBookChange} placeholder="아랍어" required />
          </label>

          <label>
            저자
            <input name="authorName" value={bookForm.authorName} onChange={handleBookChange} placeholder="한신실" required />
          </label>

          <label>
            출판사
            <input name="publisherName" value={bookForm.publisherName} onChange={handleBookChange} placeholder="윤기스쿨닷컴" required />
          </label>

          <label>
            출간일
            <input type="date" name="publishDate" value={bookForm.publishDate} onChange={handleBookChange} required />
          </label>

          <label>
            가격 (원)
            <input type="number" name="price" min="0" value={bookForm.price} onChange={handleBookChange} placeholder="20000" required />
          </label>

          <label>
            썸네일 이미지 URL
            <input type="url" name="imageUrl" value={bookForm.imageUrl} onChange={handleBookChange} placeholder="https://..." required />
          </label>
          <button
            type="button"
            className="admin-upload-btn"
            onClick={() => openImageUploadWidget("book")}
            disabled={uploadingTarget === "book"}
          >
            {uploadingTarget === "book" ? "업로드 중..." : "Cloudinary에서 이미지 선택"}
          </button>
          {bookForm.imageUrl ? (
            <div className="admin-image-preview-wrap">
              <img src={bookForm.imageUrl} alt="도서 표지 미리보기" className="admin-image-preview" />
            </div>
          ) : null}

          <label>
            상세 설명
            <textarea name="description" rows="6" value={bookForm.description} onChange={handleBookChange} placeholder="도서 상세 설명" required />
          </label>

          <label className="admin-checkbox-label">
            <input type="checkbox" name="purchasable" checked={bookForm.purchasable} onChange={handleBookCheckbox} />
            구매 가능
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? "등록 중..." : "도서 등록"}
          </button>
        </form>
      )}

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

export default AdminPage;
