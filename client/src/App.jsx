import { Navigate, Route, Routes } from "react-router-dom";
import MainPage from "./pages/MainPage";
import LoginPage from "./pages/LoginPage";
import MyPage from "./pages/MyPage";
import MyLecturesPage from "./pages/MyLecturesPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LanguageLecturesPage from "./pages/LanguageLecturesPage";
import AdminLectureEditPage from "./pages/AdminLectureEditPage";
import AdminBookEditPage from "./pages/AdminBookEditPage";
import AdminCatalogPage from "./pages/AdminCatalogPage";
import AdminStudentsPage from "./pages/AdminStudentsPage";
import LanguageLectureDetailPage from "./pages/LanguageLectureDetailPage";
import LecturesPage from "./pages/LecturesPage";
import BooksPage from "./pages/BooksPage";
import BookDetailPage from "./pages/BookDetailPage";
import OrderCheckoutPage from "./pages/OrderCheckoutPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import TeachersPage from "./pages/TeachersPage";
import { getAuthUser } from "./auth/adminAccess";
import CommonFooter from "./components/CommonFooter";

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
    <div className="app-shell">
      <main className="app-shell__content">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/books" element={<BooksPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
          <Route path="/order/:kind/:id" element={<OrderCheckoutPage />} />
          <Route path="/lectures" element={<LecturesPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
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
          <Route
            path="/my-lectures"
            element={
              <StudentOnlyRoute>
                <MyLecturesPage />
              </StudentOnlyRoute>
            }
          />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/lectures/new" element={<AdminPage defaultCategory="lecture" />} />
          <Route path="/admin/books/new" element={<AdminPage defaultCategory="book" />} />
          <Route path="/admin/lectures" element={<AdminCatalogPage kind="lecture" />} />
          <Route path="/admin/books" element={<AdminCatalogPage kind="book" />} />
          <Route path="/admin/students" element={<AdminStudentsPage />} />
          <Route path="/admin/lectures/:id/edit" element={<AdminLectureEditPage />} />
          <Route path="/admin/books/:id/edit" element={<AdminBookEditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <CommonFooter />
    </div>
  );
}

export default App;
