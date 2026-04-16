import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../api";
import "./LoginPage.css";

const initialForm = {
  email: "",
  password: "",
};

const emailRegex = /^\S+@\S+\.\S+$/;

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!emailRegex.test(form.email.trim())) {
      setErrorMessage("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (!form.password.trim()) {
      setErrorMessage("비밀번호를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      const response = await fetch(apiUrl("/api/users/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        throw new Error(data.message || "로그인에 실패했습니다.");
      }

      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }
      if (data.user) {
        localStorage.setItem("authUser", JSON.stringify(data.user));
      }

      setWelcomeName(data.user?.name || "사용자");
      setShowSuccessModal(true);
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>로그인</h1>
          <p>이메일과 비밀번호를 입력해주세요.</p>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            이메일
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            비밀번호
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              placeholder="비밀번호 입력"
              required
            />
          </label>

          {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="login-links">
          <Link to="/signup">회원가입 하러 가기</Link>
          <Link to="/">메인으로 돌아가기</Link>
        </div>
      </div>

      {showSuccessModal ? (
        <div className="login-success-overlay" role="dialog" aria-modal="true">
          <div className="login-success-modal">
            <p className="success-badge">LOGIN SUCCESS</p>
            <h2>{welcomeName}님, 로그인 성공!</h2>
            <p>계속 진행하려면 다음 버튼을 눌러주세요.</p>
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                const raw = searchParams.get("returnUrl");
                const safe =
                  raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
                navigate(safe);
              }}
            >
              다음
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LoginPage;
