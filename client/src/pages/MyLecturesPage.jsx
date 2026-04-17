import { Link, useNavigate } from "react-router-dom";
import "./MyLecturesPage.css";

const enrolledLectures = [
  {
    id: "my-lec-1",
    title: "한국어 입문 1",
    teacher: "홍길동",
    language: "한국어",
    progress: 42,
    lastStudiedAt: "2026-04-10",
    nextLesson: "3강 받침 발음 기초",
  },
  {
    id: "my-lec-2",
    title: "아랍어 왕초보 회화",
    teacher: "스마디",
    language: "아랍어",
    progress: 67,
    lastStudiedAt: "2026-04-15",
    nextLesson: "8강 인사와 자기소개",
  },
  {
    id: "my-lec-3",
    title: "히브리어 알파벳 완성",
    teacher: "다비드",
    language: "히브리어",
    progress: 25,
    lastStudiedAt: "2026-04-09",
    nextLesson: "4강 모음 조합",
  },
  {
    id: "my-lec-4",
    title: "여행 영어 패턴 100",
    teacher: "제인",
    language: "영어",
    progress: 81,
    lastStudiedAt: "2026-04-16",
    nextLesson: "16강 공항/입국 심사",
  },
];

function MyLecturesPage() {
  const navigate = useNavigate();

  return (
    <div className="my-lectures-page">
      <header className="my-lectures-header">
        <h1>내강의실</h1>
        <div className="my-lectures-actions">
          <button type="button" className="my-lectures-btn" onClick={() => navigate(-1)}>
            이전으로
          </button>
          <Link to="/" className="my-lectures-btn">
            메인으로
          </Link>
        </div>
      </header>

      <section className="my-lectures-list-wrap" aria-label="현재 수강중인 강의 목록">
        <h2>현재 수강중인 강의 (더미 데이터)</h2>
        <ul className="my-lectures-list">
          {enrolledLectures.map((lecture) => (
            <li key={lecture.id} className="my-lectures-card">
              <strong>{lecture.title}</strong>
              <p>
                {lecture.language} · 강사 {lecture.teacher}
              </p>
              <p>최근 학습일: {lecture.lastStudiedAt}</p>
              <p>다음 학습: {lecture.nextLesson}</p>
              <div className="my-lectures-progress-row">
                <span>진도율</span>
                <div className="my-lectures-progress-track">
                  <div
                    className="my-lectures-progress-fill"
                    style={{ width: `${lecture.progress}%` }}
                  />
                </div>
                <span>{lecture.progress}%</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default MyLecturesPage;
