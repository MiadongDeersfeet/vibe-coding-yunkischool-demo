import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api";
import "./LecturesPage.css";

const LANGUAGE_FILTERS = [
  { key: "all", label: "전체" },
  { key: "kr", label: "한국어" },
  { key: "en", label: "영어" },
  { key: "ar", label: "아랍어" },
  { key: "he", label: "히브리어" },
];

const PAGE_SIZE = 5;

const formatPrice = (value) =>
  `${new Intl.NumberFormat("ko-KR").format(Number(value) || 0)}원`;

function LecturesPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [lectures, setLectures] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams({
          isActive: "true",
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });
        if (activeFilter !== "all") {
          qs.set("languageKey", activeFilter);
        }
        const res = await fetch(apiUrl(`/api/lectures?${qs.toString()}`));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "강의 목록을 불러오지 못했습니다.");
        }
        if (!cancelled) {
          // Support both response shapes:
          // 1) { items, pagination } (new paginated API)
          // 2) [] (legacy list API)
          if (Array.isArray(data)) {
            const nextTotal = data.length;
            const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
            const start = (page - 1) * PAGE_SIZE;
            const pageItems = data.slice(start, start + PAGE_SIZE);
            setLectures(pageItems);
            setTotalCount(nextTotal);
            setTotalPages(nextTotalPages);
          } else {
            const items = Array.isArray(data?.items) ? data.items : [];
            const nextTotal = Number(data?.pagination?.total) || 0;
            const nextTotalPages = Math.max(1, Number(data?.pagination?.totalPages) || 1);
            setLectures(items);
            setTotalCount(nextTotal);
            setTotalPages(nextTotalPages);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "강의 목록을 불러오지 못했습니다.");
          setLectures([]);
          setTotalCount(0);
          setTotalPages(1);
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
  }, [activeFilter, page]);

  const activeFilterLabel = useMemo(
    () => LANGUAGE_FILTERS.find((f) => f.key === activeFilter)?.label || "전체",
    [activeFilter]
  );

  return (
    <div className="lectures-page">
      <div className="lectures-inner">
        <header className="lectures-header">
          <Link to="/" className="lectures-back-link">
            ← 메인으로
          </Link>
          <h1>전체 강의</h1>
          <p>언어를 선택해 원하는 강의를 찾아보세요.</p>
        </header>

        <nav className="lectures-filter-tabs" aria-label="강의 언어 필터">
          {LANGUAGE_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`lectures-tab-btn ${activeFilter === filter.key ? "is-active" : ""}`}
              onClick={() => {
                setActiveFilter(filter.key);
                setPage(1);
              }}
            >
              {filter.label}
            </button>
          ))}
        </nav>

        <section className="lectures-toolbar" aria-label="강의 목록 정보">
          <p>
            <strong>{activeFilterLabel}</strong> · 총 <strong>{totalCount}</strong>개
          </p>
        </section>

        {error ? <p className="lectures-fetch-error">{error}</p> : null}

        <section className="lectures-results" aria-label="전체 강의 목록">
          {loading ? (
            <p className="lectures-empty">불러오는 중…</p>
          ) : lectures.length === 0 ? (
            <p className="lectures-empty">등록된 강의가 없습니다.</p>
          ) : (
            lectures.map((lec) => (
              <article key={lec._id} className="lectures-item">
                <Link to={`/lectures/${lec.languageKey}/${lec._id}`} className="lectures-item-main">
                  <img src={lec.imageUrl} alt={`${lec.title} 썸네일`} className="lectures-thumb" />
                  <div className="lectures-card-text">
                    <h2>{lec.title}</h2>
                    <p className="lectures-card-language">{LANGUAGE_FILTERS.find((f) => f.key === lec.languageKey)?.label || "-"}</p>
                    <p>{lec.instructorName}</p>
                    <span>{formatPrice(lec.price)}</span>
                  </div>
                </Link>
              </article>
            ))
          )}
        </section>

        {!loading && totalCount > 0 ? (
          <nav className="lectures-pagination" aria-label="강의 목록 페이지">
            <button
              type="button"
              className="lectures-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              이전
            </button>
            <span className="lectures-page-current">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="lectures-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              다음
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

export default LecturesPage;
