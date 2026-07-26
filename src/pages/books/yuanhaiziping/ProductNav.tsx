import { Link, useLocation } from "react-router-dom";

export function ProductNav() {
  const { pathname } = useLocation();
  const inBooks = pathname.startsWith("/books/");
  return (
    <header className="product-nav">
      <Link className="product-brand" to="/">
        <span aria-hidden="true">八</span>
        八字排盘
      </Link>
      <nav aria-label="一级导航">
        <Link aria-current={!inBooks ? "page" : undefined} to="/">排盘</Link>
        <Link aria-current={inBooks ? "page" : undefined} to="/books/yuanhaiziping">典籍</Link>
      </nav>
    </header>
  );
}
