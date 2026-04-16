import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import "./LanguageLecturesPage.css";

const LANGUAGE_META = {
  kr: { label: "한국어", region: "Korea" },
  en: { label: "영어", region: "United States" },
  ar: { label: "아랍어", region: "Arab" },
  he: { label: "히브리어", region: "Israel" },
};

function LanguageLecturesPage() {
  const navigate = useNavigate();
  const { languageKey } = useParams();
  const meta = LANGUAGE_META[languageKey];
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [likedLectureIds, setLikedLectureIds] = useState([]);
  const [paymentMessage, setPaymentMessage] = useState("");
  const authToken = localStorage.getItem("authToken");

  useEffect(() => {
    if (!authToken) {
      return;
    }
    let cancelled = false;
    const loadFav = async () => {
      try {
        const res = await fetch(apiUrl("/api/me/favorites/lectures"), { headers: bearerAuthHeaders() });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setLikedLectureIds(data.map((l) => String(l._id)));
        }
      } catch {
        /* ignore */
      }
    };
    loadFav();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  useEffect(() => {
    if (!meta) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const qs = new URLSearchParams({ languageKey, isActive: "true" });
        const res = await fetch(apiUrl(`/api/lectures?${qs.toString()}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "강의 목록을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setLectures(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "강의 목록을 불러오지 못했습니다.");
          setLectures([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [languageKey, meta]);

  const formatPrice = (n) =>
    `${new Intl.NumberFormat("ko-KR").format(Number(n) || 0)}원`;

  const handleToggleLike = async (lectureId) => {
    const id = String(lectureId);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setPaymentMessage("로그인 후 찜하기를 이용할 수 있습니다.");
      return;
    }
    const liked = likedLectureIds.includes(id);
    try {
      const res = await fetch(apiUrl(`/api/me/favorites/lectures/${id}`), {
        method: liked ? "DELETE" : "POST",
        headers: bearerAuthHeaders(),
      });
      if (res.ok) {
        setLikedLectureIds((prev) =>
          liked ? prev.filter((x) => x !== id) : [...prev, id]
        );
        setPaymentMessage("");
      }
    } catch {
      /* ignore */
    }
  };

  const handlePay = (lecture) => {
    if (!lecture?._id) return;
    navigate(`/order/lecture/${lecture._id}`);
  };

  if (!meta) {
    return (
      <div className="language-lectures-page">
        <div className="language-lectures-inner">
          <p className="language-lectures-error">지원하지 않는 언어 경로입니다.</p>
          <Link to="/" className="language-lectures-back">
            메인으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="language-lectures-page">
      <div className="language-lectures-inner">
        <header className="language-lectures-header">
          <Link to="/" className="language-lectures-back">
            ← 메인
          </Link>
          <div className="language-lectures-title-block">
            <h1>{meta.label} 강의</h1>
            <p className="language-lectures-sub">{meta.region} · 판매 중인 강의 목록</p>
          </div>
        </header>

        <section className="language-lectures-list-section" aria-label="판매 중인 강의">
          <div className="language-lectures-list-head">
            <h2>판매 중인 강의</h2>
            <span className="language-lectures-count">{loading ? "…" : `${lectures.length}개`}</span>
          </div>

          {error ? <p className="language-lectures-fetch-error">{error}</p> : null}

          {loading ? (
            <p className="language-lectures-empty">불러오는 중…</p>
          ) : lectures.length === 0 ? (
            <ul className="language-lectures-list">
              <li className="language-lectures-empty">등록된 강의가 없습니다. 어드민에서 같은 언어로 강의를 등록해 보세요.</li>
            </ul>
          ) : (
            <ul className="language-lectures-list">
              {lectures.map((lec) => (
                <li key={lec._id} className="language-lecture-item">
                  <Link to={`/lectures/${languageKey}/${lec._id}`} className="language-lecture-main">
                    <div className="language-lecture-thumb-wrap">
                      <img src={lec.imageUrl} alt="" className="language-lecture-thumb" />
                    </div>
                    <div className="language-lecture-body">
                      <h3 className="language-lecture-title">{lec.title}</h3>
                      <p className="language-lecture-instructor">{lec.instructorName}</p>
                      <p className="language-lecture-short">{lec.shortDescription}</p>
                      <p className="language-lecture-price">{formatPrice(lec.price)}</p>
                      <p className="language-lecture-open-hint">→ 더보기</p>
                    </div>
                  </Link>
                  <div className="language-lecture-actions">
                    <button
                      type="button"
                      className={`lecture-action-btn lecture-like-btn ${likedLectureIds.includes(String(lec._id)) ? "is-liked" : ""}`}
                      onClick={() => handleToggleLike(lec._id)}
                      aria-label={likedLectureIds.includes(String(lec._id)) ? "찜 취소" : "찜하기"}
                      title={likedLectureIds.includes(String(lec._id)) ? "찜 취소" : "찜하기"}
                    >
                      <span className="heart-icon" aria-hidden="true">
                        {likedLectureIds.includes(String(lec._id)) ? "❤" : "♡"}
                      </span>
                    </button>
                    <button type="button" className="lecture-action-btn lecture-pay-btn" onClick={() => handlePay(lec)}>
                      결제하기
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {paymentMessage ? <p className="language-lectures-payment-message">{paymentMessage}</p> : null}
        </section>
      </div>
    </div>
  );
}

export default LanguageLecturesPage;
