import { Link } from "react-router-dom";
import "./TeachersPage.css";

const teachers = [
  {
    id: "director",
    role: "원장님",
    name: "김윤기 원장",
    image: "https://kh-3927.s3.ap-southeast-2.amazonaws.com/3472589152910499928.jpg",
    intro:
      "7년 경력의 한국어 교육 전문가로서 한국어와 관광통역 교육과정을 총괄합니다. 학습자의 실제 현장 활용 능력을 높이기 위한 커리큘럼 설계를 담당하고 있습니다.",
  },
  {
    id: "vice-director",
    role: "부원장님",
    name: "민서영 부원장",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80",
    intro:
      "수강생 학습 데이터 기반 맞춤 학습 시스템을 운영하며, 강사진과 함께 학습 피드백 프로세스를 고도화하고 있습니다. 초급부터 고급까지 학습 로드맵 설계를 맡고 있습니다.",
  },
  {
    id: "korean-teacher",
    role: "한국어 선생님",
    name: "강다은 선생님",
    image:
      "https://images.unsplash.com/photo-1557862921-37829c790f19?auto=format&fit=crop&w=900&q=80",
    intro:
      "TOPIK 대비 및 실전 회화 수업을 담당합니다. 문법 설명과 회화 훈련을 균형 있게 구성해 학습자가 실제 상황에서 자연스럽게 한국어를 사용할 수 있도록 지도합니다.",
  },
  {
    id: "english-teacher",
    role: "영어 선생님",
    name: "Daniel Kim 선생님",
    image:
      "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=900&q=80",
    intro:
      "관광통역안내사 영어 면접과 실무 영어를 전문으로 지도합니다. 실제 관광 현장에서 자주 쓰이는 표현과 롤플레이 중심 수업으로 자신감을 높여드립니다.",
  },
  {
    id: "arabic-teacher",
    role: "아랍어 선생님",
    name: "Amina Youssef 선생님",
    image:
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80",
    intro:
      "아랍어 초중급 문법과 관광 통역 실무 표현을 강의합니다. 문화적 맥락을 함께 설명해 학습자가 정확하고 자연스러운 아랍어 커뮤니케이션을 할 수 있게 돕습니다.",
  },
  {
    id: "hebrew-teacher",
    role: "히브리어 선생님",
    name: "Noa Levi 선생님",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80",
    intro:
      "히브리어 발음 교정과 기초 문장 구성, 실전 회화를 담당합니다. 반복 훈련과 피드백을 통해 짧은 기간에도 말하기 실력을 빠르게 끌어올리도록 지도합니다.",
  },
];

function TeachersPage() {
  return (
    <div className="teachers-page">
      <div className="teachers-inner">
        <header className="teachers-header">
          <Link to="/" className="teachers-back-link">
            ← 메인으로
          </Link>
          <h1>선생님 소개</h1>
          <p>원장님부터 언어별 강사진까지, 각 분야 전문 선생님을 소개합니다.</p>
        </header>

        <div className="teachers-list" aria-label="선생님 소개 카드 목록">
          {teachers.map((teacher) => (
            <section key={teacher.id} className="teacher-card-section">
              <div className="teacher-card-image-wrap">
                <img src={teacher.image} alt={`${teacher.name} 프로필`} className="teacher-card-image" />
              </div>
              <div className="teacher-card-content">
                <p className="teacher-role">{teacher.role}</p>
                <h2>{teacher.name}</h2>
                <p className="teacher-intro">{teacher.intro}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeachersPage;
