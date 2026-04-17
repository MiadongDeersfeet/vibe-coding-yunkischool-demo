import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isAdminSession } from "../auth/adminAccess";
import AdminPreviewModal from "../components/AdminPreviewModal";
import AdminResultModal from "../components/AdminResultModal";
import AdminTopNav from "../components/AdminTopNav";
import "./AdminStudentsPage.css";

const PAGE_SIZE = 10;

const GENDERS = ["남성", "여성"];
const LANGUAGES = ["한국어", "아랍어", "히브리어", "영어"];
const LAST_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const FIRST_NAMES = [
  "서준",
  "하윤",
  "도윤",
  "지우",
  "예준",
  "서연",
  "민준",
  "지민",
  "현우",
  "유진",
  "태윤",
  "수아",
];

function makeDummyStudents() {
  return Array.from({ length: 50 }, (_, index) => {
    const seq = index + 1;
    const year = 1988 + (index % 14);
    const age = 20 + (index % 19);
    const gender = GENDERS[index % GENDERS.length];
    const learningLanguage = LANGUAGES[index % LANGUAGES.length];
    const name = `${LAST_NAMES[index % LAST_NAMES.length]}${
      FIRST_NAMES[index % FIRST_NAMES.length]
    }`;
    const emailPrefix = `student${String(seq).padStart(2, "0")}`;

    return {
      id: `dummy-${String(seq).padStart(3, "0")}`,
      email: `${emailPrefix}@noortour.edu`,
      name,
      age,
      gender,
      learningLanguage,
      birthMasked: `${year}-**-**`,
      contactMasked: "010-****-****",
    };
  });
}

function AdminStudentsPage() {
  const navigate = useNavigate();
  const students = useMemo(() => makeDummyStudents(), []);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const previewFields = useMemo(() => {
    if (!selectedStudent) return [];
    return [
      { label: "이메일", value: selectedStudent.email },
      { label: "이름", value: selectedStudent.name },
      { label: "나이", value: `${selectedStudent.age}세` },
      { label: "성별", value: selectedStudent.gender },
      { label: "학습언어", value: selectedStudent.learningLanguage },
      { label: "생년월일", value: selectedStudent.birthMasked },
      { label: "연락처", value: selectedStudent.contactMasked },
    ];
  }, [selectedStudent]);

  const totalPages = Math.ceil(students.length / PAGE_SIZE);
  const pagedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return students.slice(start, start + PAGE_SIZE);
  }, [students, currentPage]);

  if (!isAdminSession()) {
    return (
      <div className="admin-students-page admin-students-page--gate">
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
    <div className="admin-students-page">
      <header className="admin-students-header">
        <h1>수강생 관리</h1>
        <p></p>
      </header>

      <AdminTopNav />

      <section className="admin-students-search">
        <div className="admin-students-helper">
          이메일 / 이름 / 나이 / 성별 / 학습언어 / 생년월일 / 연락처
        </div>
      </section>

      <section className="admin-students-list-wrap" aria-label="수강생 목록">
        {pagedStudents.length === 0 ? (
          <p className="admin-students-empty">수강생 목록이 없습니다.</p>
        ) : (
          <ul className="admin-students-list">
            {pagedStudents.map((student) => (
              <li key={student.id} className="admin-students-row">
                <button
                  type="button"
                  className="admin-students-row-main"
                  onClick={() => setSelectedStudent(student)}
                >
                  <strong>{student.name}</strong>
                  <span>
                    {student.email} · {student.age}세 · {student.gender} · {student.learningLanguage}
                  </span>
                </button>
                <button
                  type="button"
                  className="admin-students-preview-btn"
                  onClick={() => setSelectedStudent(student)}
                >
                  상세보기
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="admin-students-pagination">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            이전
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            다음
          </button>
        </div>
      </section>

      <AdminPreviewModal
        open={Boolean(selectedStudent)}
        title={selectedStudent?.name || "수강생 상세"}
        imageUrl=""
        fields={previewFields}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}

export default AdminStudentsPage;
