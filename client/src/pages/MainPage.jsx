import { useEffect, useMemo, useRef, useState } from "react";
import "./MainPage.css";
import { Link, useNavigate } from "react-router-dom";
import { fetchServerBooks, mergeBooksForDisplay } from "../data/booksMerge";

const quickMenus = [
  { label: "수강신청", menuType: "language-dropdown", hasArrow: true },
  { label: "선생님", menuType: "teachers-page" },
  { label: "수강후기", sectionType: "books" },
  { label: "커뮤니티", hasArrow: true },
  { label: "고객센터", hasArrow: true },
];

const languageQuickMenuItems = [
  { key: "kr", label: "한국어" },
  { key: "en", label: "영어" },
  { key: "ar", label: "아랍어" },
  { key: "he", label: "히브리어" },
];

const sections = [
  { title: "언어별 강의", type: "language", count: 4 },
  { title: "도서구매", type: "books", count: 14 },
  { title: "관광통역안내사 과정", type: "guide", count: 6 },
];

const languageCards = [
  {
    id: "lang-kr",
    slug: "kr",
    title: "한국어",
    subtitle: "Korea",
    meta: "강의",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%EC%84%B8%EC%A2%85%EB%8C%80%EC%99%95+%ED%95%9C%EA%B8%80.png",
  },
  {
    id: "lang-en",
    slug: "en",
    title: "영어",
    subtitle: "United States",
    meta: "강의",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%EC%98%81%EC%96%B4.png",
  },
  {
    id: "lang-ar",
    slug: "ar",
    title: "아랍어",
    subtitle: "Arab",
    meta: "강의",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%EC%95%84%EB%9E%8D%EC%9D%B8.png",
  },
  {
    id: "lang-he",
    slug: "he",
    title: "히브리어",
    subtitle: "Israel",
    meta: "강의",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/%ED%9E%88%EB%B8%8C%EB%A6%AC%EC%96%B4+%EC%9D%B4%EC%8A%A4%EB%9D%BC%EC%97%98.png",
  },
];

const guideCards = [
  {
    id: "guide-1",
    title: "관광학개론",
    subtitle: "필기 1과목",
    meta: "강사 박은빈",
    image: "https://contents.kyobobook.co.kr/sih/fit-in/400x0/pdt/9791166394331.jpg",
  },
  {
    id: "guide-2",
    title: "관광법규",
    subtitle: "필기 2과목",
    meta: "강사 우영우",
    image: "https://image.aladin.co.kr/product/38558/71/letslook/S812135936_b.jpg",
  },
  {
    id: "guide-3",
    title: "관광국사",
    subtitle: "필기 3과목",
    meta: "강사 전원도",
    image: "https://thumbnail.coupangcdn.com/thumbnails/remote/492x492ex/image/vendor_inventory/98c7/8be9a9205498583f746fa9b06c3eb7de341c5fe231b75c14f28df228884e.png",
  },
  {
    id: "guide-4",
    title: "관광자원해설",
    subtitle: "필기 4과목",
    meta: "강사 전원도",
    image: "https://contents.kyobobook.co.kr/sih/fit-in/400x0/pdt/9791166393563.jpg",
  },
  {
    id: "guide-5",
    title: "영어 관광통역안내사 면접대비",
    subtitle: "영어 구술 면접",
    meta: "강사 다니엘",
    image: "https://contents.kyobobook.co.kr/sih/fit-in/280x0/pdt/9791138806411.jpg",
  },
  {
    id: "guide-6",
    title: "아랍어 관광통역안내사 면접대비",
    subtitle: "아랍어 구술 면접",
    meta: "강사 스마디",
    image: "https://www.jaenung.net/storage/ai/article/compressed/db8802b6-9db1-4e40-b9ab-93aea82ba68a.jpg",
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
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");
  const [bookPage, setBookPage] = useState(0);
  const [displayBooks, setDisplayBooks] = useState(() => mergeBooksForDisplay([]));
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const swipeStartX = useRef(null);
  const authUser = useMemo(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [token]);

  const userName = authUser?.name || "";

  const isAdminUser = useMemo(() => {
    return Boolean(token && authUser?.user_role === "admin");
  }, [authUser, token]);

  const isStudentUser = useMemo(() => {
    return Boolean(token && authUser?.user_role === "student");
  }, [authUser, token]);

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

  const handleQuickMenuClick = (menu) => {
    if (menu.menuType === "language-dropdown") {
      setIsLanguageDropdownOpen((prev) => !prev);
      return;
    }
    if (menu.menuType === "teachers-page") {
      setIsLanguageDropdownOpen(false);
      navigate("/teachers");
      return;
    }
    setIsLanguageDropdownOpen(false);
    if (!menu.sectionType) return;
    const target = document.getElementById(`section-${menu.sectionType}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLanguageQuickMenuClick = (languageKey) => {
    setIsLanguageDropdownOpen(false);
    navigate(`/lectures?language=${languageKey}`);
  };

  return (
    <div className="main-page">
      <header className="top-header">
        <div className="top-header-branding">
          <div className="brand-row">
            <div className="brand-logo-wrap" aria-hidden="true">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTtPs55lopyXgrytGL1NdiZ3PQvn84Pwo-LSw&s"
                alt=""
                className="brand-logo-image"
              />
            </div>
            <div className="brand">윤기스쿨</div>
          </div>
          <p className="brand-subtitle">한국어 · 제2외국어 · 관광통역 학습 플랫폼</p>
        </div>
        <div className="top-header-top">
          <div className="auth-actions">
            {isAdminUser ? (
              <Link to="/admin" className="signin-btn">
                관리자
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
            {isStudentUser ? (
              <Link to="/my-lectures" className="signin-btn">
                내강의실
              </Link>
            ) : null}
          </div>
          {isLoggedIn && userName ? <p className="welcome-text">{userName}님 환영합니다.</p> : null}
        </div>
      </header>

      <div className="quick-menu-row">
        {quickMenus.map((menu) => {
          const isLanguageDropdownMenu = menu.menuType === "language-dropdown";
          return (
            <div key={menu.label} className="quick-menu-item-wrap">
              <button
                type="button"
                className={`quick-menu-item ${isLanguageDropdownMenu && isLanguageDropdownOpen ? "is-open" : ""}`}
                onClick={() => handleQuickMenuClick(menu)}
                aria-expanded={isLanguageDropdownMenu ? isLanguageDropdownOpen : undefined}
                aria-haspopup={isLanguageDropdownMenu ? "menu" : undefined}
              >
                <span>{menu.label}</span>
                {menu.hasArrow ? <span className="menu-caret" aria-hidden="true" /> : null}
              </button>
              {isLanguageDropdownMenu && isLanguageDropdownOpen ? (
                <div className="quick-menu-dropdown" role="menu" aria-label="수강 신청 언어 선택">
                  {languageQuickMenuItems.map((language) => (
                    <button
                      key={language.key}
                      type="button"
                      className="quick-menu-dropdown-item"
                      onClick={() => handleLanguageQuickMenuClick(language.key)}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <main className="content-area">
        {sections.map((section) => {
          const isLanguageSection = section.type === "language";
          const isBookSection = section.type === "books";
          const isGuideSection = section.type === "guide";
          const baseCards = isLanguageSection
            ? languageCards
            : isBookSection
              ? displayBooks
              : isGuideSection
                ? guideCards
              : makeCards(section.count, section.title.toLowerCase().replace(/\s+/g, "-"));
          const cards = isBookSection ? [] : baseCards;

          return (
            <section
              key={section.title}
              id={`section-${section.type}`}
              className={`content-section ${isLanguageSection ? "language-section" : ""} ${isBookSection ? "book-section" : ""}`}
            >
              <div className="section-head">
                <h2>{section.title}</h2>
                {isLanguageSection ? (
                  <Link to="/lectures" className="section-head-link">
                    View all
                  </Link>
                ) : isBookSection ? (
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
                <div className={`card-grid ${isLanguageSection ? "language-grid" : ""} ${isGuideSection ? "guide-grid" : ""}`}>
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
