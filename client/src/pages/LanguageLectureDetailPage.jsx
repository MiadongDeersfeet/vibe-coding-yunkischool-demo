import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import "./LanguageLectureDetailPage.css";

const LANGUAGE_META = {
  kr: { label: "한국어" },
  en: { label: "영어" },
  ar: { label: "아랍어" },
  he: { label: "히브리어" },
};

function LanguageLectureDetailPage() {
  const navigate = useNavigate();
  const { languageKey, lectureId } = useParams();
  const meta = LANGUAGE_META[languageKey];
  const [lecture, setLecture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  useEffect(() => {
    if (!lecture || String(lecture._id) !== String(lectureId)) {
      setLiked(false);
      return;
    }
    if (!localStorage.getItem("authToken")) {
      setLiked(false);
      return;
    }
    const id = String(lecture._id);
    let cancelled = false;
    const loadFav = async () => {
      try {
        const res = await fetch(apiUrl("/api/me/favorites/lectures"), { headers: bearerAuthHeaders() });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setLiked(data.some((l) => String(l._id) === id));
        }
      } catch {
        if (!cancelled) setLiked(false);
      }
    };
    loadFav();
    return () => {
      cancelled = true;
    };
  }, [lecture, lectureId]);

  useEffect(() => {
    if (!meta) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const loadLecture = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl(`/api/lectures/${lectureId}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "강의 상세 정보를 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setLecture(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "강의 상세 정보를 불러오지 못했습니다.");
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
  }, [lectureId, meta]);

  const formatPrice = (n) =>
    `${new Intl.NumberFormat("ko-KR").format(Number(n) || 0)}원`;

  const handlePay = () => {
    if (!lecture?._id) return;
    navigate(`/order/lecture/${lecture._id}`);
  };

  const handleToggleLike = async () => {
    if (!lecture) return;
    const id = String(lecture._id);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setPaymentMessage("로그인 후 찜하기를 이용할 수 있습니다.");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/me/favorites/lectures/${id}`), {
        method: liked ? "DELETE" : "POST",
        headers: bearerAuthHeaders(),
      });
      if (res.ok) {
        setLiked((v) => !v);
        setPaymentMessage("");
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="lecture-detail-page">
      <div className="lecture-detail-inner">
        <header className="lecture-detail-header">
          <Link to={`/lectures/${languageKey}`} className="lecture-detail-back">
            ← {meta?.label || "언어"} 강의 목록
          </Link>
        </header>

        {!meta ? (
          <p className="lecture-detail-error">지원하지 않는 언어 경로입니다.</p>
        ) : loading ? (
          <p className="lecture-detail-empty">불러오는 중…</p>
        ) : error ? (
          <p className="lecture-detail-error">{error}</p>
        ) : !lecture ? (
          <p className="lecture-detail-empty">강의 정보를 찾을 수 없습니다.</p>
        ) : (
          <article className="lecture-detail-card">
            <div className="lecture-detail-thumb-wrap">
              <img src={lecture.imageUrl} alt="" className="lecture-detail-thumb" />
            </div>

            <div className="lecture-detail-body">
              <h1>{lecture.title}</h1>
              <p className="lecture-detail-instructor">{lecture.instructorName}</p>
              <p className="lecture-detail-price">{formatPrice(lecture.price)}</p>
              <p className="lecture-detail-short">{lecture.shortDescription}</p>

              <section className="lecture-detail-description-section" aria-label="강의 상세 설명">
                <h2>강의 상세 내용</h2>
                <p className="lecture-detail-description">
                  {lecture.description || "상세 설명이 아직 등록되지 않았습니다."}
                </p>
              </section>

              <div className="lecture-detail-actions">
                <button
                  type="button"
                  className={`lecture-detail-btn lecture-detail-like-btn ${liked ? "is-liked" : ""}`}
                  onClick={handleToggleLike}
                  aria-label={liked ? "찜 취소" : "찜하기"}
                  title={liked ? "찜 취소" : "찜하기"}
                >
                  <span className="heart-icon" aria-hidden="true">
                    {liked ? "❤" : "♡"}
                  </span>
                </button>
                <button type="button" className="lecture-detail-btn lecture-detail-pay-btn" onClick={handlePay}>
                  결제하기
                </button>
              </div>

              {paymentMessage ? <p className="lecture-detail-payment-message">{paymentMessage}</p> : null}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

export default LanguageLectureDetailPage;
