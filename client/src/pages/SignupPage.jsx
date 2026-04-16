import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../api";
import "./SignupPage.css";

const initialForm = {
  email: "",
  name: "",
  password: "",
  confirmPassword: "",
  user_role: "student",
};

const emailRegex = /^\S+@\S+\.\S+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*\d)[a-z\d]{8,15}$/;

function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!passwordRegex.test(form.password)) {
      setErrorMessage("비밀번호는 영소문자와 숫자를 포함한 8~15자여야 합니다.");
      return;
    }

    if (!emailRegex.test(form.email.trim())) {
      setErrorMessage("올바른 이메일 형식을 입력해주세요.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...payload } = form;
      const response = await fetch(apiUrl("/api/users"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("이미 사용 중인 이메일입니다.");
        }
        throw new Error(data.message || "회원가입에 실패했습니다.");
      }

      setSuccessMessage("회원가입이 완료되었습니다.");
      setForm(initialForm);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-header">
          <h1>회원가입</h1>
          <p>이메일, 이름, 비밀번호, 사용자 역할을 입력해주세요.</p>
        </div>

        <form className="signup-form" onSubmit={onSubmit}>
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
            이름
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="홍길동"
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
              placeholder="영소문자+숫자 포함 8~15자 (예: abc12345)"
              pattern="^(?=.*[a-z])(?=.*\d)[a-z\d]{8,15}$"
              title="영소문자와 숫자를 포함한 8~15자만 입력 가능합니다."
              required
            />
          </label>

          <label>
            비밀번호 확인
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder="비밀번호와 동일하게 입력"
              required
            />
          </label>

          <label>
            사용자 역할
            <select name="user_role" value={form.user_role} onChange={onChange} required>
              <option value="student">student</option>
              <option value="teacher">teacher</option>
            </select>
          </label>

          {errorMessage ? <p className="form-message error">{errorMessage}</p> : null}
          {successMessage ? <p className="form-message success">{successMessage}</p> : null}

          <button type="submit" disabled={loading}>
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="signup-links">
          <Link to="/login" className="back-link">
            로그인 하러 가기
          </Link>
          <Link to="/" className="back-link">
            메인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
