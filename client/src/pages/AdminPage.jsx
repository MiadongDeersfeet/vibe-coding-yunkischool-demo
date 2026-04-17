import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders, jsonAuthHeaders } from "../api/authHeaders";
import { isAdminSession } from "../auth/adminAccess";
import AdminResultModal from "../components/AdminResultModal";
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

function AdminPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("lecture");
  const [lectureForm, setLectureForm] = useState(initialLectureForm);
  const [bookForm, setBookForm] = useState(initialBookForm);
  const [lectures, setLectures] = useState([]);
  const [books, setBooks] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [resultModal, setResultModal] = useState({
    open: false,
    title: "",
    message: "",
    variant: "success",
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState("");

  const closeResultModal = () => setResultModal((prev) => ({ ...prev, open: false }));

  const showResultModal = ({ message, variant = "success", title }) => {
    setResultModal({
      open: true,
      message,
      variant,
      title: title || (variant === "error" ? "알림" : "완료"),
    });
  };

  const loadProducts = useCallback(async () => {
    setListError("");
    setListLoading(true);
    try {
      const [lectureRes, bookRes] = await Promise.all([
        fetch(apiUrl("/api/lectures")),
        fetch(apiUrl("/api/books")),
      ]);

      if (!lectureRes.ok || !bookRes.ok) {
        const lectureError = !lectureRes.ok
          ? await lectureRes.json().catch(() => ({}))
          : null;
        const bookError = !bookRes.ok
          ? await bookRes.json().catch(() => ({}))
          : null;
        throw new Error(
          lectureError?.message || bookError?.message || "목록을 불러오지 못했습니다."
        );
      }

      const [lectureData, bookData] = await Promise.all([lectureRes.json(), bookRes.json()]);
      setLectures(Array.isArray(lectureData) ? lectureData : []);
      setBooks(Array.isArray(bookData) ? bookData : []);
    } catch (err) {
      setListError(err.message || "목록을 불러오지 못했습니다.");
      setLectures([]);
      setBooks([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminSession()) return;
    loadProducts();
  }, [loadProducts]);

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
      await loadProducts();
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
      await loadProducts();
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

  const handleDeleteLecture = async (id) => {
    if (!window.confirm("이 강의를 삭제할까요?")) {
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/lectures/${id}`), {
        method: "DELETE",
        headers: bearerAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "삭제에 실패했습니다.");
      }
      await loadProducts();
    } catch (err) {
      setListError(err.message || "삭제에 실패했습니다.");
    }
  };

  const handleDeleteBook = async (id) => {
    if (!window.confirm("이 도서를 삭제할까요?")) {
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/books/${id}`), {
        method: "DELETE",
        headers: bearerAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "삭제에 실패했습니다.");
      }
      await loadProducts();
    } catch (err) {
      setListError(err.message || "삭제에 실패했습니다.");
    }
  };

  const formatPrice = (n) =>
    `${new Intl.NumberFormat("ko-KR").format(Number(n) || 0)}원`;

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
        <h1>어드민 · 상품 등록</h1>
        <div className="admin-header-links">
          <Link to="/admin/orders" className="admin-home-link">
            주문관리
          </Link>
          <Link to="/" className="admin-home-link">
            메인으로 돌아가기
          </Link>
        </div>
      </div>

      <div className="admin-category-tabs" role="tablist" aria-label="등록 카테고리 선택">
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === "lecture"}
          className={`admin-category-tab ${activeCategory === "lecture" ? "is-active" : ""}`}
          onClick={() => {
            closeResultModal();
            setActiveCategory("lecture");
          }}
        >
          강의 등록
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === "book"}
          className={`admin-category-tab ${activeCategory === "book" ? "is-active" : ""}`}
          onClick={() => {
            closeResultModal();
            setActiveCategory("book");
          }}
        >
          도서 등록
        </button>
      </div>

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
            카테고리 이름 (선택, 비우면 서버에서 &quot;미분류&quot;)
            <input name="categoryName" value={lectureForm.categoryName} onChange={handleLectureChange} placeholder="한국어 입문" />
          </label>

          <label>
            카테고리 ID (선택, Mongo ObjectId 문자열. 비우면 서버에서 자동 생성)
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

      <section className="admin-list-section" aria-label="등록된 상품 목록">
        <div className="admin-list-head">
          <h2>{activeCategory === "lecture" ? "등록된 강의" : "등록된 도서"}</h2>
          <button type="button" className="admin-refresh-btn" onClick={() => loadProducts()}>
            새로고침
          </button>
        </div>
        {listError ? <p className="admin-list-error">{listError}</p> : null}
        {listLoading ? (
          <p className="admin-list-empty">불러오는 중…</p>
        ) : activeCategory === "lecture" ? (
          lectures.length === 0 ? (
            <p className="admin-list-empty">등록된 강의가 없습니다.</p>
          ) : (
          <ul className="admin-lecture-list">
            {lectures.map((lec) => (
              <li key={lec._id} className="admin-lecture-row">
                <div className="admin-lecture-main">
                  <strong>{lec.title}</strong>
                  <span className="admin-lecture-meta">
                    {lec.languageKey || "—"} · {lec.instructorName} · {formatPrice(lec.price)}
                  </span>
                </div>
                <div className="admin-lecture-actions">
                  <Link to={`/admin/lectures/${lec._id}/edit`} className="admin-edit-link">
                    수정
                  </Link>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDeleteLecture(lec._id)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
          )
        ) : books.length === 0 ? (
          <p className="admin-list-empty">등록된 도서가 없습니다.</p>
        ) : (
          <ul className="admin-lecture-list">
            {books.map((book) => (
              <li key={book._id} className="admin-lecture-row">
                <div className="admin-lecture-main">
                  <strong>{book.title}</strong>
                  <span className="admin-lecture-meta">
                    {book.subtitle || "—"} · {book.authorName} · {formatPrice(book.price)}
                  </span>
                </div>
                <div className="admin-lecture-actions">
                  <Link to={`/admin/books/${book._id}/edit`} className="admin-edit-link">
                    수정
                  </Link>
                  <button type="button" className="admin-delete-btn" onClick={() => handleDeleteBook(book._id)}>
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
