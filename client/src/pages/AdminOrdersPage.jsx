import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import { isAdminSession } from "../auth/adminAccess";
import AdminResultModal from "../components/AdminResultModal";
import "./AdminOrdersPage.css";

const ORDER_STATUS_LABELS = {
  pending: "결제대기",
  paid: "주문완료",
  cancelled: "주문취소",
  refunded: "환불완료",
};

function formatPrice(n) {
  return `${new Intl.NumberFormat("ko-KR").format(Number(n) || 0)}원`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function AdminOrdersPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lecture");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/orders/admin/items"), {
        headers: bearerAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "주문 목록을 불러오지 못했습니다.");
      }
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err.message || "주문 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminSession()) return;
    loadOrders();
  }, [loadOrders]);

  const lectureRows = useMemo(
    () => rows.filter((row) => row?.itemType === "lecture"),
    [rows]
  );
  const bookRows = useMemo(
    () => rows.filter((row) => row?.itemType === "book"),
    [rows]
  );
  const activeRows = activeTab === "lecture" ? lectureRows : bookRows;

  if (!isAdminSession()) {
    return (
      <div className="admin-orders-page admin-orders-page--gate">
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
    <div className="admin-orders-page">
      <div className="admin-orders-header">
        <h1>어드민 · 주문 관리</h1>
        <div className="admin-orders-header-links">
          <Link to="/admin" className="admin-orders-link">
            상품관리
          </Link>
          <Link to="/" className="admin-orders-link">
            메인으로 돌아가기
          </Link>
        </div>
      </div>

      <div className="admin-orders-tabs" role="tablist" aria-label="주문 유형 탭">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "lecture"}
          className={`admin-orders-tab ${activeTab === "lecture" ? "is-active" : ""}`}
          onClick={() => setActiveTab("lecture")}
        >
          강의주문관리 ({lectureRows.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "book"}
          className={`admin-orders-tab ${activeTab === "book" ? "is-active" : ""}`}
          onClick={() => setActiveTab("book")}
        >
          도서주문관리 ({bookRows.length})
        </button>
      </div>

      <section className="admin-orders-list-section">
        <div className="admin-orders-list-head">
          <h2>{activeTab === "lecture" ? "강의 주문 목록" : "도서 주문 목록"}</h2>
          <button type="button" className="admin-orders-refresh" onClick={loadOrders}>
            새로고침
          </button>
        </div>
        {error ? <p className="admin-orders-error">{error}</p> : null}
        {loading ? (
          <p className="admin-orders-empty">불러오는 중…</p>
        ) : activeRows.length === 0 ? (
          <p className="admin-orders-empty">주문 내역이 없습니다.</p>
        ) : (
          <ul className="admin-orders-list">
            {activeRows.map((row) => {
              const productTitle =
                activeTab === "lecture"
                  ? row.lecture?.title || row.title || "강의"
                  : row.book?.title || row.title || "도서";
              const productMeta =
                activeTab === "lecture"
                  ? row.lecture?.instructorName || "-"
                  : row.book?.subtitle || "-";
              const orderStatusLabel = ORDER_STATUS_LABELS[row.orderStatus] || row.orderStatus || "-";
              const key = `${row.orderId}-${row.itemType}-${row.lecture?.id || row.book?.id || row.title}`;

              return (
                <li key={key} className="admin-orders-row">
                  <div className="admin-orders-main">
                    <strong>{productTitle}</strong>
                    <span className="admin-orders-meta">
                      {productMeta} · 수량 {row.quantity}개 · {formatPrice(row.lineAmount)}
                    </span>
                    <span className="admin-orders-user">
                      주문자: {row.user?.name || "이름없음"} ({row.user?.email || "이메일없음"})
                    </span>
                    <span className="admin-orders-date">주문일: {formatDate(row.orderedAt)}</span>
                  </div>
                  <div className="admin-orders-side">
                    <span className="admin-orders-badge">{orderStatusLabel}</span>
                    <span className="admin-orders-id">주문번호: {row.orderId}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default AdminOrdersPage;
