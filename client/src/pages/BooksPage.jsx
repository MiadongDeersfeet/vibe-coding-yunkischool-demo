import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiUrl } from "../api";
import { bearerAuthHeaders } from "../api/authHeaders";
import { fetchServerBooks, isMongoObjectIdString, mergeBooksForDisplay } from "../data/booksMerge";
import "./BooksPage.css";

/** DB/정적 데이터에 자주 쓰이는 부제(언어) 표시 순서 — 실제 목록에 있는 것만 노출 */
const SUBTITLE_TAB_ORDER = ["한국어", "영어", "아랍어", "히브리어"];
const BOOKS_PER_PAGE = 5;

function BooksPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("전체");
  const [page, setPage] = useState(0);
  const prevActiveFilterRef = useRef(activeFilter);
  const [likedBookIds, setLikedBookIds] = useState([]);
  const [actionMessage, setActionMessage] = useState("");
  const [displayBooks, setDisplayBooks] = useState(() => mergeBooksForDisplay([]));
  const authToken = localStorage.getItem("authToken");

  useEffect(() => {
    let cancelled = false;
    fetchServerBooks().then((docs) => {
      if (!cancelled) setDisplayBooks(mergeBooksForDisplay(docs));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!authToken) {
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/me/favorites/books"), { headers: bearerAuthHeaders() });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setLikedBookIds(data.map((b) => String(b._id ?? "")));
        }
      } catch {
        /* ignore */
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const categoryFilters = useMemo(() => {
    const seen = new Set();
    for (const book of displayBooks) {
      const label = String(book.subtitle ?? "").trim();
      if (label) seen.add(label);
    }
    const orderedKnown = SUBTITLE_TAB_ORDER.filter((label) => seen.has(label));
    const extras = [...seen]
      .filter((label) => !SUBTITLE_TAB_ORDER.includes(label))
      .sort((a, b) => a.localeCompare(b, "ko"));
    return ["전체", ...orderedKnown, ...extras];
  }, [displayBooks]);

  useEffect(() => {
    if (activeFilter !== "전체" && !categoryFilters.includes(activeFilter)) {
      setActiveFilter("전체");
    }
  }, [activeFilter, categoryFilters]);

  const visibleBooks = useMemo(() => {
    if (activeFilter === "전체") return displayBooks;
    return displayBooks.filter((book) => book.subtitle === activeFilter);
  }, [activeFilter, displayBooks]);

  const totalPages = Math.max(1, Math.ceil(visibleBooks.length / BOOKS_PER_PAGE));

  useEffect(() => {
    const filterChanged = prevActiveFilterRef.current !== activeFilter;
    prevActiveFilterRef.current = activeFilter;
    const maxIdx = Math.max(0, totalPages - 1);
    if (filterChanged) {
      setPage(0);
      return;
    }
    setPage((p) => Math.min(Math.max(0, p), maxIdx));
  }, [activeFilter, totalPages]);

  const pagedBooks = useMemo(() => {
    const start = page * BOOKS_PER_PAGE;
    return visibleBooks.slice(start, start + BOOKS_PER_PAGE);
  }, [visibleBooks, page]);

  const handleToggleLike = async (bookId) => {
    setActionMessage("");
    const id = String(bookId);
    const token = localStorage.getItem("authToken");
    const isMongo = isMongoObjectIdString(id);

    if (isMongo && token) {
      const liked = likedBookIds.includes(id);
      try {
        const res = await fetch(apiUrl(`/api/me/favorites/books/${id}`), {
          method: liked ? "DELETE" : "POST",
          headers: bearerAuthHeaders(),
        });
        if (res.ok) {
          setLikedBookIds((prev) =>
            liked ? prev.filter((x) => x !== id) : [...prev, id]
          );
        }
      } catch {
        /* ignore */
      }
      return;
    }

    if (isMongo && !token) {
      setActionMessage("로그인 후 찜하기를 이용할 수 있습니다.");
      return;
    }

    setLikedBookIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePay = (book) => {
    const bid = String(book.id ?? "");
    if (!isMongoObjectIdString(bid)) {
      setActionMessage("등록된 도서만 온라인 주문 페이지로 이동할 수 있습니다.");
      return;
    }
    navigate(`/order/book/${bid}`);
  };

  return (
    <div className="books-page">
      <div className="books-inner">
        <header className="books-header">
          <Link to="/" className="books-back-link">
            ← 메인으로
          </Link>
          <h1>윤기스쿨 서점</h1>
          <p>선생님들이 수업에서 실제로 사용하는 교재입니다.</p>
        </header>

        <nav className="books-filter-tabs" aria-label="도서 부제(카테고리) 필터">
          {categoryFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`books-tab-btn ${activeFilter === filter ? "is-active" : ""}`}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </nav>

        <section className="books-toolbar" aria-label="도서 목록 정보">
          <p>
            총 <strong>{visibleBooks.length}</strong>권
          </p>
        </section>

        <section className="books-results list-view" aria-label="전체 도서">
          {pagedBooks.map((book, index) => (
            <article key={book.id} className="books-item">
              <Link to={`/books/${book.id}`} className="books-item-main">
                <div className="books-rank">{page * BOOKS_PER_PAGE + index + 1}</div>
                <img src={book.image} alt={`${book.title} 표지`} className="books-thumb" />
                <div className="books-card-text">
                  <h2>{book.title}</h2>
                  <p>{book.subtitle}</p>
                  <span>{book.meta}</span>
                </div>
              </Link>
              <div className="books-item-actions">
                <button
                  type="button"
                  className={`book-action-btn book-like-btn ${likedBookIds.includes(String(book.id)) ? "is-liked" : ""}`}
                  onClick={() => handleToggleLike(book.id)}
                  aria-label={likedBookIds.includes(String(book.id)) ? "찜 취소" : "찜하기"}
                  title={likedBookIds.includes(String(book.id)) ? "찜 취소" : "찜하기"}
                >
                  <span className="heart-icon" aria-hidden="true">
                    {likedBookIds.includes(String(book.id)) ? "❤" : "♡"}
                  </span>
                </button>
                <button type="button" className="book-action-btn book-pay-btn" onClick={() => handlePay(book)}>
                  결제하기
                </button>
              </div>
            </article>
          ))}
        </section>

        {visibleBooks.length > 0 ? (
          <nav className="books-pagination" aria-label="도서 목록 페이지">
            <button
              type="button"
              className="books-page-btn"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              이전
            </button>
            <div className="books-page-indicator">
              <span className="books-page-current">
                {page + 1} / {totalPages}
              </span>
              <span className="books-page-range">
                {page * BOOKS_PER_PAGE + 1}
                –
                {Math.min((page + 1) * BOOKS_PER_PAGE, visibleBooks.length)}번째
              </span>
            </div>
            <button
              type="button"
              className="books-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              다음
            </button>
          </nav>
        ) : null}

        {actionMessage ? <p className="books-action-message">{actionMessage}</p> : null}
      </div>
    </div>
  );
}

export default BooksPage;
