"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("tt90_theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("tt90_theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar modo claro/oscuro"
      className="btn-ghost"
      style={{ padding: "8px 12px", fontSize: "1rem", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}
