// 应用根组件：BrowserRouter + 路由 -> 排盘页面。
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PaipanPage } from "@/pages/paipan/PaipanPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaipanPage />} />
      </Routes>
    </BrowserRouter>
  );
}
