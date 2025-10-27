import { Link } from "react-router-dom";
export default function Home() {
  return (
    <div className="p-6 flex flex-col text-center items-center justify-center space-y-4">
      <h1 className="text-orange-400 text-6xl font-bold">TankCalc PRO</h1>
      <h2 className="text-4xl font-bold">Cálculo de Espessura do Costado</h2>
      <ul className="space-y-2 p-2">
        <li>
          <Link to="/anexo-a" className="text-blue-600 text-2xl">
            Anexo A
          </Link>
        </li>
        <li>
          <Link to="/ponto-fixo" className="text-blue-600 text-2xl">
            Corpo da Norma - Ponto Fixo
          </Link>
        </li>
        <li>
          <Link to="/ponto-variavel" className="text-blue-600 text-2xl">
            Corpo da Norma - Ponto Variável
          </Link>
        </li>
        {/* Adicione outros módulos aqui */}
      </ul>
    </div>
  );
}
