import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { isAdminSession } from "../auth/adminAccess";
import AdminResultModal from "../components/AdminResultModal";
import AdminTopNav from "../components/AdminTopNav";
import "./AdminDashboardPage.css";

const DASHBOARD_KPI = {
  totalMembers: 8421,
  newMembers: 184,
  activeMembers: 6758,
  totalRevenue: 482350000,
  avgOrderValue: 64100,
  paidOrders: 7520,
  lectureRevenue: 291500000,
  bookRevenue: 190850000,
  repeatPurchaseRate: 34.7,
};

const KPI_CARD_ITEMS = [
  { label: "총 회원 수", value: `${formatNumber(DASHBOARD_KPI.totalMembers)}명` },
  { label: "신규 회원 수 (이번 달)", value: `${formatNumber(DASHBOARD_KPI.newMembers)}명` },
  { label: "활성 회원 수", value: `${formatNumber(DASHBOARD_KPI.activeMembers)}명` },
  { label: "총 매출액", value: formatWon(DASHBOARD_KPI.totalRevenue) },
  { label: "평균 주문 금액", value: formatWon(DASHBOARD_KPI.avgOrderValue) },
  { label: "누적 결제 완료 주문", value: `${formatNumber(DASHBOARD_KPI.paidOrders)}건` },
  { label: "강의 매출", value: formatWon(DASHBOARD_KPI.lectureRevenue) },
  { label: "도서 매출", value: formatWon(DASHBOARD_KPI.bookRevenue) },
  { label: "재구매율", value: `${DASHBOARD_KPI.repeatPurchaseRate}%` },
];

const MONTHLY_REVENUE = [
  { month: "1월", amount: 31200000 },
  { month: "2월", amount: 35800000 },
  { month: "3월", amount: 40100000 },
  { month: "4월", amount: 42700000 },
  { month: "5월", amount: 46300000 },
  { month: "6월", amount: 49200000 },
];

const ORDER_STATUS_DATA = [
  { label: "결제완료", count: 1204, color: "#6d28d9" },
  { label: "배송중", count: 328, color: "#2563eb" },
  { label: "취소요청", count: 47, color: "#f59e0b" },
  { label: "환불완료", count: 29, color: "#ef4444" },
];

const RECENT_ACTIVITY = [
  "신규 회원 23명이 오늘 가입했습니다.",
  "아랍어 왕초보 강의가 이번 주 인기 1위입니다.",
  "도서 재고 부족 알림 2건이 발생했습니다.",
  "결제 실패율이 어제 대비 0.3% 감소했습니다.",
];

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatWon(value) {
  return `${formatNumber(value)}원`;
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const revenueMax = useMemo(
    () => Math.max(...MONTHLY_REVENUE.map((item) => item.amount)),
    []
  );
  const orderStatusTotal = useMemo(
    () => ORDER_STATUS_DATA.reduce((sum, item) => sum + item.count, 0),
    []
  );

  if (!isAdminSession()) {
    return (
      <div className="admin-dashboard-page admin-dashboard-page--gate">
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
    <div className="admin-dashboard-page">
      <header className="admin-dashboard-header">
        <h1>대시보드</h1>
        <p>운영 지표 확인 및 등록/주문 관리</p>
      </header>

      <AdminTopNav />

      <section className="admin-kpi-grid" aria-label="핵심 지표">
        {KPI_CARD_ITEMS.map((item) => (
          <article className="admin-kpi-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-panels">
        <article className="admin-panel">
          <h2>월별 매출 추이</h2>
          <ul className="admin-revenue-bars">
            {MONTHLY_REVENUE.map((item) => (
              <li key={item.month} className="admin-revenue-row">
                <span className="admin-revenue-label">{item.month}</span>
                <div className="admin-revenue-track">
                  <div
                    className="admin-revenue-fill"
                    style={{ width: `${(item.amount / revenueMax) * 100}%` }}
                  />
                </div>
                <span className="admin-revenue-value">{formatWon(item.amount)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-panel">
          <h2>주문 상태 분포</h2>
          <ul className="admin-status-list">
            {ORDER_STATUS_DATA.map((status) => {
              const ratio = (status.count / orderStatusTotal) * 100;
              return (
                <li key={status.label} className="admin-status-item">
                  <div className="admin-status-head">
                    <span>{status.label}</span>
                    <strong>{formatNumber(status.count)}건</strong>
                  </div>
                  <div className="admin-status-track">
                    <div
                      className="admin-status-fill"
                      style={{ width: `${ratio}%`, backgroundColor: status.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      <section className="admin-panel" aria-label="최근 운영 동향">
        <h2>최근 운영 동향</h2>
        <ul className="admin-activity-list">
          {RECENT_ACTIVITY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default AdminDashboardPage;
