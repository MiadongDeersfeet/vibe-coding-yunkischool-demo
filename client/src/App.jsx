import { Navigate, Route, Routes } from "react-router-dom";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import MyPage from "./pages/MyPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import LanguageLecturesPage from "./pages/LanguageLecturesPage";
import AdminLectureEditPage from "./pages/AdminLectureEditPage";
import AdminBookEditPage from "./pages/AdminBookEditPage";
import LanguageLectureDetailPage from "./pages/LanguageLectureDetailPage";
import BooksPage from "./pages/BooksPage";
import BookDetailPage from "./pages/BookDetailPage";
import OrderCheckoutPage from "./pages/OrderCheckoutPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import { getAuthUser } from "./auth/adminAccess";

function StudentOnlyRoute({ children }) {
  const token = localStorage.getItem("authToken");
  const user = getAuthUser();

  if (!token || !user) {
    return <Navigate to="/login?returnUrl=%2Fmypage" replace />;
  }
  if (user.user_role !== "student") {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/books" element={<BooksPage />} />
      <Route path="/books/:bookId" element={<BookDetailPage />} />
      <Route path="/order/:kind/:id" element={<OrderCheckoutPage />} />
      <Route path="/lectures/:languageKey" element={<LanguageLecturesPage />} />
      <Route path="/lectures/:languageKey/:lectureId" element={<LanguageLectureDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/mypage"
        element={
          <StudentOnlyRoute>
            <MyPage />
          </StudentOnlyRoute>
        }
      />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/orders" element={<AdminOrdersPage />} />
      <Route path="/admin/lectures/:id/edit" element={<AdminLectureEditPage />} />
      <Route path="/admin/books/:id/edit" element={<AdminBookEditPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
