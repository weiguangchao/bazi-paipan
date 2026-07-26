// 应用根组件：BrowserRouter + 排盘、典籍按需路由。
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PaipanPage } from "@/pages/paipan/PaipanPage";
import { ProductNav } from "@/pages/books/yuanhaiziping/ProductNav";

const CatalogRoutes = lazy(() => import("@/pages/books/yuanhaiziping/CatalogRoutes"));
const ChapterEntry = lazy(() => import("@/pages/books/yuanhaiziping/ChapterEntry"));

export default function App() {
  return (
    <BrowserRouter>
      <ProductNav />
      <Suspense fallback={<main className="book-loading" aria-live="polite">正在打开页面…</main>}>
        <Routes>
          <Route path="/" element={<PaipanPage />} />
          <Route path="/books/yuanhaiziping/chapters/:chapterId" element={<ChapterEntry />} />
          <Route path="/books/*" element={<CatalogRoutes />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
