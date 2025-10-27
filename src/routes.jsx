// src/routes.jsx
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import RenderAnexoA from "./modules/AnexoA";
import PontoFixo from "./modules/PontoFixo";
import PontoVariavel from "./modules/PontoVariavel";
import { Hash } from "lucide-react";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/anexo-a" element={<RenderAnexoA />} />
      <Route path="/ponto-fixo" element={<PontoFixo />} />
      <Route path="/ponto-variavel" element={<PontoVariavel />} />
      {/* Adicione outras rotas aqui */}
    </Routes>
  );
}
