import { useEffect, useMemo, useRef, useState } from "react";
import "./MainPage.css";
import { Link } from "react-router-dom";
import { fetchServerBooks, mergeBooksForDisplay } from "../data/booksMerge";

const quickMenus = [
  "언어강의",
  "도서구매",
  "관광통역가이드",
];

const sections = [
  { title: "언어별 강의", type: "language", count: 4 },
  { title: "도서구매", type: "books", count: 14 },
  { title: "관광통역안내사", count: 8 },
  { title: "City Hot Spots", count: 8 },
  { title: "Trending Creators", count: 10 },
];

const languageCards = [
  {
    id: "lang-kr",
    slug: "kr",
    title: "한국어",
    subtitle: "Korea",
    meta: "강의 | 도서 | 관광통역안내사",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%EC%84%B8%EC%A2%85%EB%8C%80%EC%99%95+%ED%95%9C%EA%B8%80.png",
  },
  {
    id: "lang-en",
    slug: "en",
    title: "영어",
    subtitle: "United States",
    meta: "강의 | 도서 | 관광통역안내사",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%EC%98%81%EC%96%B4.png",
  },
  {
    id: "lang-ar",
    slug: "ar",
    title: "아랍어",
    subtitle: "Arab",
    meta: "강의 | 도서 | 관광통역안내사",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%EC%95%84%EB%9E%8D%EC%9D%B8.png",
  },
  {
    id: "lang-he",
    slug: "he",
    title: "히브리어",
    subtitle: "Israel",
    meta: "강의 | 도서 | 관광통역안내사",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%ED%9E%88%EB%B8%8C%EB%A6%AC%EC%96%B4+%EC%9D%B4%EC%8A%A4%EB%9D%BC%EC%97%98.png",
  },
];

const makeCards = (count, prefix) =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    title: `Tour idea ${i + 1}`,
    subtitle: "Short travel description",
    meta: `${Math.floor(Math.random() * 60) + 5}K views`,
  }));

function MainPage() {
  const BOOKS_PER_PAGE = 4;
  const BOOK_SWIPE_THRESHOLD = 40;
  const token = localStorage.getItem("authToken");
  const [bookPage, setBookPage] = useState(0);
  const [displayBooks, setDisplayBooks] = useState(() => mergeBooksForDisplay([]));
  const swipeStartX = useRef(null);
  const userName = useMemo(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return "";
      return JSON.parse(raw)?.name || "";
    } catch {
      return "";
    }
  }, [token]);

  const isAdminUser = useMemo(() => {
    if (!token) return false;
    try {
      return JSON.parse(localStorage.getItem("authUser") || "null")?.user_role === "admin";
    } catch {
      return false;
    }
  }, [token]);

  const isLoggedIn = Boolean(token);

  useEffect(() => {
    let cancelled = false;
    fetchServerBooks().then((docs) => {
      if (!cancelled) setDisplayBooks(mergeBooksForDisplay(docs));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bookPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < displayBooks.length; i += BOOKS_PER_PAGE) {
      pages.push(displayBooks.slice(i, i + BOOKS_PER_PAGE));
    }
    return pages;
  }, [BOOKS_PER_PAGE, displayBooks]);

  const totalBookPages = Math.max(1, Math.ceil(displayBooks.length / BOOKS_PER_PAGE));

  useEffect(() => {
    setBookPage((p) => (p >= totalBookPages ? 0 : p));
  }, [totalBookPages]);

  const moveToPrevBookPage = () => {
    if (totalBookPages <= 1) return;
    setBookPage((prev) => (prev === 0 ? totalBookPages - 1 : prev - 1));
  };

  const moveToNextBookPage = () => {
    if (totalBookPages <= 1) return;
    setBookPage((prev) => (prev === totalBookPages - 1 ? 0 : prev + 1));
  };

  const handleBookPointerDown = (event) => {
    swipeStartX.current = event.clientX;
  };

  const handleBookPointerUp = (event) => {
    if (swipeStartX.current == null) return;
    const deltaX = event.clientX - swipeStartX.current;
    swipeStartX.current = null;

    if (Math.abs(deltaX) < BOOK_SWIPE_THRESHOLD) return;
    if (deltaX > 0) {
      moveToPrevBookPage();
    } else {
      moveToNextBookPage();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.reload();
  };

  return (
    <div className="main-page">
      <header className="top-header">
        <div className="brand">윤기스쿨</div>
        <input className="search-input" placeholder="Search destinations, creators, guides..." />
        <div className="auth-actions">
          {isAdminUser ? (
            <Link to="/admin" className="signin-btn">
              어드민
            </Link>
          ) : null}
          {isLoggedIn ? (
            <button type="button" className="signin-btn" onClick={handleLogout}>
              로그아웃
            </button>
          ) : (
            <Link to="/login" className="signin-btn">
              로그인
            </Link>
          )}
          {!isLoggedIn ? (
            <Link to="/signup" className="signin-btn">
              회원가입
            </Link>
          ) : !isAdminUser ? (
            <Link to="/mypage" className="signin-btn">
              마이페이지
            </Link>
          ) : null}
        </div>
      </header>
      {isLoggedIn && userName ? <p className="welcome-text">{userName}님 환영합니다.</p> : null}

      <div className="quick-menu-row">
        {quickMenus.map((menu) => (
          <button key={menu} className="quick-menu-item">
            <span className="menu-dot" />
            {menu}
          </button>
        ))}
      </div>

      <main className="content-area">
        {sections.map((section) => {
          const isLanguageSection = section.type === "language";
          const isBookSection = section.type === "books";
          const baseCards = isLanguageSection
            ? languageCards
            : isBookSection
              ? displayBooks
              : makeCards(section.count, section.title.toLowerCase().replace(/\s+/g, "-"));
          const cards = isBookSection ? [] : baseCards;

          return (
            <section
              key={section.title}
              className={`content-section ${isLanguageSection ? "language-section" : ""} ${isBookSection ? "book-section" : ""}`}
            >
              <div className="section-head">
                <h2>{section.title}</h2>
                {isBookSection ? (
                  <Link to="/books" className="section-head-link">
                    View all
                  </Link>
                ) : (
                  <button>View all</button>
                )}
              </div>

              {isBookSection ? (
                <div
                  className="book-slider"
                  onPointerDown={handleBookPointerDown}
                  onPointerUp={handleBookPointerUp}
                  onPointerCancel={() => (swipeStartX.current = null)}
                >
                  <button
                    type="button"
                    className="book-overlay-btn book-overlay-btn-prev"
                    onClick={moveToPrevBookPage}
                    aria-label="이전 도서 목록"
                  >
                    <span className="book-overlay-triangle left" aria-hidden="true" />
                  </button>
                  <div className="book-slider-viewport">
                    <div
                      className="book-slider-track"
                      style={{ transform: `translateX(-${bookPage * 100}%)` }}
                    >
                      {bookPages.map((pageCards, pageIdx) => (
                        <div key={`book-page-${pageIdx}`} className="book-slider-page">
                          <div className="card-grid book-grid">
                            {pageCards.map((card) => (
                              <Link
                                key={card.id}
                                to={`/books/${card.id}`}
                                className="content-card book-card book-card-link"
                              >
                                {card.image ? (
                                  <img
                                    src={card.image}
                                    alt={`${card.title} 카드`}
                                    className="thumb card-thumb-image book-thumb-image"
                                  />
                                ) : (
                                  <div className="thumb tone-1" />
                                )}
                                <div className="card-text">
                                  <h3>{card.title}</h3>
                                  <p>{card.subtitle}</p>
                                  <span>{card.meta}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="book-overlay-btn book-overlay-btn-next"
                    onClick={moveToNextBookPage}
                    aria-label="다음 도서 목록"
                  >
                    <span className="book-overlay-triangle right" aria-hidden="true" />
                  </button>
                  <p className="book-slide-page">{bookPage + 1} / {totalBookPages}</p>
                </div>
              ) : (
                <div className={`card-grid ${isLanguageSection ? "language-grid" : ""}`}>
                  {cards.map((card, index) => {
                    const cardInner = (
                      <>
                        {card.image ? (
                          <img
                            src={card.image}
                            alt={`${card.title} 카드`}
                            className="thumb card-thumb-image"
                          />
                        ) : (
                          <div className={`thumb tone-${(index % 6) + 1}`} />
                        )}
                        <div className="card-text">
                          <h3>{card.title}</h3>
                          <p>{card.subtitle}</p>
                          <span>{card.meta}</span>
                        </div>
                      </>
                    );

                    if (isLanguageSection && card.slug) {
                      return (
                        <Link
                          key={card.id}
                          to={`/lectures/${card.slug}`}
                          className="language-card-link content-card language-card"
                        >
                          {cardInner}
                        </Link>
                      );
                    }

                    return (
                      <article key={card.id} className="content-card">
                        {cardInner}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}

export default MainPage;
