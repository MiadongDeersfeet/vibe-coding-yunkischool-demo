import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import { bookCards } from "../data/bookCards";
import { fetchBookDisplayById, isMongoObjectIdString } from "../data/booksMerge";
import "./BookDetailPage.css";

function BookDetailPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const staticBook = useMemo(() => bookCards.find((item) => item.id === bookId), [bookId]);
  const [remoteBook, setRemoteBook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeHint, setLikeHint] = useState("");

  useEffect(() => {
    if (staticBook) {
      setRemoteBook(null);
      setLoading(false);
      return;
    }
    if (!bookId || !isMongoObjectIdString(bookId)) {
      setRemoteBook(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRemoteBook(null);
    fetchBookDisplayById(bookId).then((b) => {
      if (!cancelled) setRemoteBook(b);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [bookId, staticBook]);

  const book = staticBook || remoteBook;

  const favoriteApiId = useMemo(() => {
    if (bookId && isMongoObjectIdString(bookId)) return bookId;
    return null;
  }, [bookId]);

  useEffect(() => {
    setLikeHint("");
    if (!favoriteApiId || !localStorage.getItem("authToken")) {
      setIsLiked(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/me/favorites/books"), { headers: bearerAuthHeaders() });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setIsLiked(data.some((b) => String(b._id) === favoriteApiId));
        }
      } catch {
        if (!cancelled) setIsLiked(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [favoriteApiId, book?.id]);

  const handleToggleBookLike = async () => {
    setLikeHint("");
    if (favoriteApiId) {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLikeHint("로그인 후 찜하기를 이용할 수 있습니다.");
        return;
      }
      try {
        const res = await fetch(apiUrl(`/api/me/favorites/books/${favoriteApiId}`), {
          method: isLiked ? "DELETE" : "POST",
          headers: bearerAuthHeaders(),
        });
        if (res.ok) {
          setIsLiked((v) => !v);
        }
      } catch {
        /* ignore */
      }
      return;
    }

    setIsLiked((v) => !v);
  };

  const hardcodedDescription = `아랍어를 처음 배우는 학습자를 위한 기초 입문 교재입니다.
이 책은 문자와 발음부터 시작해, 일상에서 바로 사용할 수 있는 기본 표현까지 단계적으로 학습할 수 있도록 구성되어 있습니다.

단순 암기가 아니라 실제 상황에서 활용할 수 있는 회화 중심으로 내용을 구성하여, 처음 아랍어를 접하는 분들도 부담 없이 시작할 수 있습니다. 또한 핵심 표현을 반복적으로 익히며 자연스럽게 말하기 능력을 키울 수 있도록 돕습니다.

아랍어 학습에 필요한 기초 문법과 필수 어휘를 함께 제공하여, 독학으로도 충분히 학습이 가능하도록 설계되었습니다. 초보 학습자뿐만 아니라, 기초를 다시 정리하고 싶은 분들에게도 적합한 교재입니다.`;

  if (loading && !book) {
    return (
      <div className="book-detail-page">
        <div className="book-detail-inner">
          <p className="book-detail-empty">도서 정보를 불러오는 중…</p>
          <Link to="/books" className="book-detail-back">
            ← 전체 도서 목록으로
          </Link>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="book-detail-page">
        <div className="book-detail-inner">
          <p className="book-detail-empty">도서를 찾을 수 없습니다.</p>
          <Link to="/books" className="book-detail-back">
            ← 전체 도서 목록으로
          </Link>
        </div>
      </div>
    );
  }

  const detail = {
    title: book.title || "",
    subtitle: book.subtitle || "",
    description:
      book.id === "book-ar-1"
        ? hardcodedDescription
        : book.description || "도서 상세 설명이 아직 등록되지 않았습니다.",
    authorName: book.authorName || "한신실",
    publisherName: book.publisherName || "윤기스쿨닷컴",
    publishDate: book.publishDate ? new Date(book.publishDate) : new Date(),
    price: typeof book.price === "number" && !Number.isNaN(book.price) ? book.price : 20000,
    purchasable: book.purchasable !== false,
    imageUrl: book.imageUrl || book.image || "",
  };

  const publishDateText = detail.publishDate
    ? new Date(detail.publishDate).toLocaleDateString("ko-KR")
    : "미등록";
  const formattedPrice = `${new Intl.NumberFormat("ko-KR").format(detail.price)}원`;

  const handleBuy = () => {
    setLikeHint("");
    if (!detail.purchasable) return;
    if (bookId && isMongoObjectIdString(bookId)) {
      navigate(`/order/book/${bookId}`);
      return;
    }
    setLikeHint("등록된 도서만 온라인 주문 페이지로 이동할 수 있습니다.");
  };

  return (
    <div className="book-detail-page">
      <div className="book-detail-inner">
        <header className="book-detail-header">
          <Link to="/books" className="book-detail-back">
            ← 전체 도서 목록
          </Link>
        </header>

        <section className="book-detail-layout">
          <article className="book-detail-main">
            <h1>{detail.title}</h1>
            <p className="book-detail-subtitle">{detail.subtitle}</p>
            <div className="book-detail-thumb-wrap">
              <img src={detail.imageUrl} alt={`${detail.title} 표지`} className="book-detail-thumb" />
            </div>
          </article>

          <div className="book-detail-side">
            <aside className="book-detail-info">
              <dl>
                <div>
                  <dt>저자</dt>
                  <dd>{detail.authorName}</dd>
                </div>
                <div>
                  <dt>출판사</dt>
                  <dd>{detail.publisherName}</dd>
                </div>
                <div>
                  <dt>출간일</dt>
                  <dd>{publishDateText}</dd>
                </div>
              </dl>
            </aside>

            <section className="book-detail-description-section" aria-label="도서 상세 설명">
              <h2>도서 상세</h2>
              <p className="book-detail-description">{detail.description}</p>
            </section>
          </div>
        </section>

        <section className="book-detail-payment-section" aria-label="결제 섹션">
          <p className="book-detail-price">{formattedPrice}</p>
          <p className="book-detail-stock">{detail.purchasable ? "구매 가능" : "일시 품절"}</p>
          <div className="book-detail-buy-actions">
            <button
              type="button"
              className={`book-detail-like-btn ${isLiked ? "is-liked" : ""}`}
              onClick={handleToggleBookLike}
              aria-label={isLiked ? "찜 취소" : "찜하기"}
              title={isLiked ? "찜 취소" : "찜하기"}
            >
              <span className="heart-icon" aria-hidden="true">
                {isLiked ? "❤" : "♡"}
              </span>
            </button>
            <button type="button" className="book-buy-btn primary" disabled={!detail.purchasable} onClick={handleBuy}>
              바로구매
            </button>
          </div>
        </section>

        {likeHint ? <p className="book-detail-like-hint">{likeHint}</p> : null}

      </div>
    </div>
  );
}

export default BookDetailPage;
