import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import "./MyPage.css";

function getAuthUser() {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const ROLE_LABELS = {
  student: "학습자",
  teacher: "강사",
  admin: "관리자",
};

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
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function MyPage() {
  const token = localStorage.getItem("authToken");
  const user = useMemo(() => getAuthUser(), [token]);
  const isStudentUser = user?.user_role === "student";

  const [lectureOrders, setLectureOrders] = useState([]);
  const [bookOrders, setBookOrders] = useState([]);
  const [lectureFavorites, setLectureFavorites] = useState([]);
  const [bookFavorites, setBookFavorites] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const lectureValidUntil = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return formatDate(date);
  }, []);

  const loadMyPageData = useCallback(async () => {
    if (!token || !isStudentUser) {
      setLectureOrders([]);
      setBookOrders([]);
      setLectureFavorites([]);
      setBookFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [or, lr, br] = await Promise.all([
        fetch(apiUrl("/api/me/orders"), { headers: bearerAuthHeaders() }),
        fetch(apiUrl("/api/me/favorites/lectures"), { headers: bearerAuthHeaders() }),
        fetch(apiUrl("/api/me/favorites/books"), { headers: bearerAuthHeaders() }),
      ]);
      if (!or.ok || !lr.ok || !br.ok) {
        const e0 = !or.ok ? await or.json().catch(() => ({})) : {};
        const e1 = !lr.ok ? await lr.json().catch(() => ({})) : {};
        const e2 = !br.ok ? await br.json().catch(() => ({})) : {};
        throw new Error(e0.message || e1.message || e2.message || "마이페이지 정보를 불러오지 못했습니다.");
      }
      const [odata, ldata, bdata] = await Promise.all([or.json(), lr.json(), br.json()]);
      const orderRows = Array.isArray(odata) ? odata : [];
      setLectureOrders(orderRows.filter((row) => row?.itemType === "lecture"));
      setBookOrders(orderRows.filter((row) => row?.itemType === "book"));
      setLectureFavorites(Array.isArray(ldata) ? ldata : []);
      setBookFavorites(Array.isArray(bdata) ? bdata : []);
    } catch (err) {
      setError(err.message || "마이페이지 정보를 불러오지 못했습니다.");
      setLectureOrders([]);
      setBookOrders([]);
      setLectureFavorites([]);
      setBookFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [isStudentUser, token]);

  useEffect(() => {
    loadMyPageData();
  }, [loadMyPageData]);

  const initial = user?.name?.charAt(0)?.toUpperCase() || "?";
  const roleLabel = ROLE_LABELS[user?.user_role] || user?.user_role || "—";

  if (token && user && !isStudentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="my-page">
      <div className="my-page-inner">
        <header className="my-page-header">
          <h1 className="my-page-title">마이페이지</h1>
          <Link to="/" className="my-page-back">
            메인으로
          </Link>
        </header>

        {!token || !user ? (
          <section className="my-page-guest">
            <p>로그인 후 내 정보와 찜 목록을 확인할 수 있습니다.</p>
            <div className="my-page-guest-actions">
              <Link to="/login" className="my-page-btn my-page-btn-primary">
                로그인
              </Link>
              <Link to="/signup" className="my-page-btn my-page-btn-ghost">
                회원가입
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="my-profile-card" aria-label="내 정보">
              <div className="my-profile-avatar" aria-hidden="true">
                {initial}
              </div>
              <div className="my-profile-body">
                <p className="my-profile-name">{user.name}</p>
                <p className="my-profile-email">{user.email}</p>
                <span className="my-profile-role">{roleLabel}</span>
              </div>
            </section>

            <div className="my-favorites-grid">
              <section className="my-favorites-section" aria-labelledby="my-lecture-order-heading">
                <div className="my-favorites-section-head">
                  <h2 id="my-lecture-order-heading">강의 주문</h2>
                  <span className="my-favorites-count">{loading ? "…" : `${lectureOrders.length}개`}</span>
                </div>
                {loading ? (
                  <p className="my-favorites-empty">불러오는 중…</p>
                ) : lectureOrders.length === 0 ? (
                  <p className="my-favorites-empty">주문한 강의가 없습니다.</p>
                ) : (
                  <ul className="my-favorites-list">
                    {lectureOrders.map((item) => {
                      const lectureId = item?.lecture?.id || "";
                      const href = lectureId ? `/lectures/${item.lecture?.languageKey || "kr"}/${lectureId}` : "";
                      const title = item?.lecture?.title || item?.title || "강의";
                      const meta = item?.lecture?.instructorName || "";
                      const key = `${item.orderId}-${item.itemType}-${lectureId || title}`;
                      const content = (
                        <>
                          <div className="my-favorite-thumb-wrap">
                            {item?.lecture?.imageUrl ? (
                              <img src={item.lecture.imageUrl} alt="" className="my-favorite-thumb" />
                            ) : (
                              <div className="my-favorite-thumb-placeholder" />
                            )}
                          </div>
                          <div className="my-favorite-text">
                            <span className="my-favorite-title">{title}</span>
                            <span className="my-favorite-meta">
                              {meta ? `${meta} · ` : ""}
                              {formatPrice(item.lineAmount)}
                            </span>
                            <span className="my-order-sub-meta">주문일 {formatDate(item.orderedAt)}</span>
                            <span className="my-order-sub-meta">유효기간 {lectureValidUntil} (오늘로부터 1년)</span>
                          </div>
                        </>
                      );
                      return (
                        <li key={key} className="my-favorite-item">
                          {href ? (
                            <Link to={href} className="my-favorite-link">
                              {content}
                            </Link>
                          ) : (
                            <div className="my-favorite-link">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="my-favorites-section" aria-labelledby="my-book-order-heading">
                <div className="my-favorites-section-head">
                  <h2 id="my-book-order-heading">도서 주문</h2>
                  <span className="my-favorites-count">{loading ? "…" : `${bookOrders.length}개`}</span>
                </div>
                {loading ? (
                  <p className="my-favorites-empty">불러오는 중…</p>
                ) : bookOrders.length === 0 ? (
                  <p className="my-favorites-empty">주문한 도서가 없습니다.</p>
                ) : (
                  <ul className="my-favorites-list">
                    {bookOrders.map((item) => {
                      const bookId = item?.book?.id || "";
                      const title = item?.book?.title || item?.title || "도서";
                      const subtitle = item?.book?.subtitle || "";
                      const key = `${item.orderId}-${item.itemType}-${bookId || title}`;
                      const content = (
                        <>
                          <div className="my-favorite-thumb-wrap">
                            {item?.book?.imageUrl ? (
                              <img src={item.book.imageUrl} alt="" className="my-favorite-thumb my-favorite-thumb-book" />
                            ) : (
                              <div className="my-favorite-thumb-placeholder" />
                            )}
                          </div>
                          <div className="my-favorite-text">
                            <span className="my-favorite-title">{title}</span>
                            <span className="my-favorite-meta">
                              {subtitle ? `${subtitle} · ` : ""}
                              {formatPrice(item.lineAmount)}
                            </span>
                            <div className="my-order-row">
                              <span className="my-order-sub-meta">주문일 {formatDate(item.orderedAt)}</span>
                              <span className="my-order-badge">{ORDER_STATUS_LABELS[item.orderStatus] || "주문완료"}</span>
                            </div>
                          </div>
                        </>
                      );
                      return (
                        <li key={key} className="my-favorite-item">
                          {bookId ? (
                            <Link to={`/books/${bookId}`} className="my-favorite-link">
                              {content}
                            </Link>
                          ) : (
                            <div className="my-favorite-link">{content}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            {error ? (
              <p className="my-page-error" role="alert">
                {error}{" "}
                <button type="button" className="my-page-retry" onClick={() => loadMyPageData()}>
                  다시 시도
                </button>
              </p>
            ) : null}

            <div className="my-favorites-grid">
              <section className="my-favorites-section" aria-labelledby="my-lecture-fav-heading">
                <div className="my-favorites-section-head">
                  <h2 id="my-lecture-fav-heading">강의 찜</h2>
                  <span className="my-favorites-count">{loading ? "…" : `${lectureFavorites.length}개`}</span>
                </div>
                {loading ? (
                  <p className="my-favorites-empty">불러오는 중…</p>
                ) : lectureFavorites.length === 0 ? (
                  <p className="my-favorites-empty">찜한 강의가 없습니다. 언어별 강의 목록에서 하트를 눌러 보세요.</p>
                ) : (
                  <ul className="my-favorites-list">
                    {lectureFavorites.map((lec) => {
                      const id = lec._id != null ? String(lec._id) : "";
                      const href = `/lectures/${lec.languageKey || "kr"}/${id}`;
                      return (
                        <li key={id} className="my-favorite-item">
                          <Link to={href} className="my-favorite-link">
                            <div className="my-favorite-thumb-wrap">
                              {lec.imageUrl ? (
                                <img src={lec.imageUrl} alt="" className="my-favorite-thumb" />
                              ) : (
                                <div className="my-favorite-thumb-placeholder" />
                              )}
                            </div>
                            <div className="my-favorite-text">
                              <span className="my-favorite-title">{lec.title}</span>
                              <span className="my-favorite-meta">
                                {lec.instructorName} · {formatPrice(lec.price)}
                              </span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="my-favorites-section" aria-labelledby="my-book-fav-heading">
                <div className="my-favorites-section-head">
                  <h2 id="my-book-fav-heading">도서 찜</h2>
                  <span className="my-favorites-count">{loading ? "…" : `${bookFavorites.length}개`}</span>
                </div>
                {loading ? (
                  <p className="my-favorites-empty">불러오는 중…</p>
                ) : bookFavorites.length === 0 ? (
                  <p className="my-favorites-empty">찜한 도서가 없습니다. 도서 목록에서 하트를 눌러 보세요.</p>
                ) : (
                  <ul className="my-favorites-list">
                    {bookFavorites.map((book) => {
                      const id = book._id != null ? String(book._id) : "";
                      return (
                        <li key={id} className="my-favorite-item">
                          <Link to={`/books/${id}`} className="my-favorite-link">
                            <div className="my-favorite-thumb-wrap">
                              {book.imageUrl ? (
                                <img src={book.imageUrl} alt="" className="my-favorite-thumb my-favorite-thumb-book" />
                              ) : (
                                <div className="my-favorite-thumb-placeholder" />
                              )}
                            </div>
                            <div className="my-favorite-text">
                              <span className="my-favorite-title">{book.title}</span>
                              <span className="my-favorite-meta">{book.subtitle}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MyPage;
