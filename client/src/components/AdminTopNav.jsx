import { Link, NavLink } from "react-router-dom";
import "./AdminTopNav.css";

const adminNavItems = [
  { to: "/admin", label: "대시보드", end: true },
  { to: "/admin/orders", label: "주문관리", end: true },
  { to: "/admin/lectures/new", label: "강의등록", end: true },
  { to: "/admin/books/new", label: "도서등록", end: true },
  { to: "/admin/lectures", label: "등록된 강의", end: true },
  { to: "/admin/books", label: "등록된 도서", end: true },
  { to: "/admin/students", label: "수강생 관리", end: true },
];

function AdminTopNav() {
  return (
    <nav className="admin-top-nav" aria-label="어드민 메뉴">
      <div className="admin-top-nav__items">
        {adminNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `admin-top-nav__item ${isActive ? "is-active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
      <Link to="/" className="admin-top-nav__home">
        홈으로
      </Link>
    </nav>
  );
}

export default AdminTopNav;
