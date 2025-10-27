// src/router.jsx
import React from "react";
import { BrowserRouter, HashRouter } from "react-router-dom";

// Verifica se estamos rodando no Electron
const isElectron = import.meta.env.VITE_ELECTRON === "true";

export function CustomRouter({ children }) {
  return isElectron ? (
    <HashRouter>{children}</HashRouter>
  ) : (
    <BrowserRouter>{children}</BrowserRouter>
  );
}
