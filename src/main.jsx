import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import EditSite from "./EditSite.jsx";
import "./styles.css";

const base = import.meta.env.BASE_URL || "/";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename={base}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/edit" element={<EditSite />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
