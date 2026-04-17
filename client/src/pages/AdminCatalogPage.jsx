import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import { isAdminSession } from "../auth/adminAccess";
import AdminPreviewModal from "../components/AdminPreviewModal";
import AdminResultModal from "../components/AdminResultModal";
import AdminTopNav from "../components/AdminTopNav";
import "./AdminCatalogPage.css";

function formatPrice(n) {
  return `${new Intl.NumberFormat("ko-KR").format(Number(n) || 0)}원`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getPreviewFields(kind, item) {
  if (!item) return [];

  if (kind === "lecture") {
    return [
      { label: "강의명", value: item.title },
      { label: "강사", value: item.instructorName },
      { label: "언어", value: item.languageKey },
      { label: "가격", value: formatPrice(item.price) },
      { label: "카테고리", value: item.categoryName || "미분류" },
      { label: "판매상태", value: item.isActive ? "판매중" : "비활성" },
      { label: "짧은 소개", value: item.shortDescription },
      { label: "상세 설명", value: item.description },
    ];
  }

  return [
    { label: "도서명", value: item.title },
    { label: "부제", value: item.subtitle },
    { label: "저자", value: item.authorName },
    { label: "출판사", value: item.publisherName },
    { label: "출간일", value: formatDate(item.publishDate) },
    { label: "가격", value: formatPrice(item.price) },
    { label: "구매상태", value: item.purchasable ? "구매가능" : "품절/비활성" },
    { label: "상세 설명", value: item.description },
  ];
}

function AdminCatalogPage({ kind = "lecture" }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState(null);

  const pageTitle = kind === "lecture" ? "등록된 강의" : "등록된 도서";
  const listTitle = kind === "lecture" ? "강의 목록" : "도서 목록";
  const endpoint = kind === "lecture" ? "/api/lectures" : "/api/books";
  const editBasePath = kind === "lecture" ? "/admin/lectures" : "/admin/books";

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl(endpoint));
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "목록을 불러오지 못했습니다.");
      }
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setItems([]);
      setError(err.message || "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!isAdminSession()) return;
    loadItems();
  }, [loadItems]);

  const handleDelete = async (id) => {
    const targetName = kind === "lecture" ? "강의" : "도서";
    if (!window.confirm(`이 ${targetName}를 삭제할까요?`)) return;

    try {
      const response = await fetch(apiUrl(`${endpoint}/${id}`), {
        method: "DELETE",
        headers: bearerAuthHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "삭제에 실패했습니다.");
      }
      await loadItems();
      if (previewItem?._id === id) setPreviewItem(null);
    } catch (err) {
      setError(err.message || "삭제에 실패했습니다.");
    }
  };

  const previewFields = useMemo(
    () => getPreviewFields(kind, previewItem),
    [kind, previewItem]
  );

  if (!isAdminSession()) {
    return (
      <div className="admin-catalog-page admin-catalog-page--gate">
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
    <div className="admin-catalog-page">
      <div className="admin-catalog-header">
        <h1>{pageTitle}</h1>
      </div>

      <AdminTopNav />

      <section className="admin-catalog-section" aria-label={listTitle}>
        <div className="admin-catalog-head">
          <h2>{listTitle}</h2>
          <button type="button" className="admin-catalog-refresh" onClick={loadItems}>
            새로고침
          </button>
        </div>

        {error ? <p className="admin-catalog-error">{error}</p> : null}

        {loading ? (
          <p className="admin-catalog-empty">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="admin-catalog-empty">등록된 항목이 없습니다.</p>
        ) : (
          <ul className="admin-catalog-list">
            {items.map((item) => (
              <li key={item._id} className="admin-catalog-row">
                <button
                  type="button"
                  className="admin-catalog-open"
                  onClick={() => setPreviewItem(item)}
                >
                  <strong>{item.title || (kind === "lecture" ? "강의" : "도서")}</strong>
                  <span>
                    {kind === "lecture"
                      ? `${item.languageKey || "—"} · ${item.instructorName || "-"} · ${formatPrice(item.price)}`
                      : `${item.subtitle || "—"} · ${item.authorName || "-"} · ${formatPrice(item.price)}`}
                  </span>
                </button>

                <div className="admin-catalog-actions">
                  <button
                    type="button"
                    className="admin-catalog-preview-btn"
                    onClick={() => setPreviewItem(item)}
                  >
                    미리보기
                  </button>
                  <Link to={`${editBasePath}/${item._id}/edit`} className="admin-catalog-edit-link">
                    수정
                  </Link>
                  <button
                    type="button"
                    className="admin-catalog-delete-btn"
                    onClick={() => handleDelete(item._id)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminPreviewModal
        open={Boolean(previewItem)}
        title={previewItem?.title || ""}
        imageUrl={previewItem?.imageUrl || ""}
        fields={previewFields}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

export default AdminCatalogPage;
