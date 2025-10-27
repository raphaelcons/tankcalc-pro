import { useState } from "react";
import calcularPontoFixo from "./utils/pontoFixo";
import InputWrapper from "../components/ui/InputWrapper";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { InfoPopover } from "../components/ui/info"
import { House, Settings } from "lucide-react";
import { Toggle } from "../components/ui/toggle";
import { Link } from "react-router-dom";
import { NumericFormat } from "react-number-format";
import { useEffect } from "react";

const fluidos = [
  "Petróleo (Teto Flutuante)",
  "Petróleo (Teto Fixo)",
  "Gasolina",
  "Querosene",
  "Nafta Pesada",
  "Óleo Diesel",
  "Gasóleo",
  "Óleo combustível",
  "Asfalto",
  "Asfalto Diluído",
  "Álcool etílico (anidro ou hidratado) ou Metanol",
];

const materiais = [
  "A131 Grade A",
  "A131 Grade B",
  "A36",
  "A283 Grade C",
  "A516 Grade 55",
  "A516 Grade 60",
  "A516 Grade 65",
  "A516 Grade 70",
  "A573 Grade 70",
]

const numero_padrao_aneis = 2; // Número padrão de anéis para o casco, pode ser alterado pelo usuário

let materiais_casco = Array(numero_padrao_aneis).fill(materiais[0]);
let sobresspessuras_casco = Array(numero_padrao_aneis).fill(0);
let larguras_chapa = Array(numero_padrao_aneis).fill(0);

export default function PontoFixo() {
  const [form, setForm] = useState({
    tag: "",
    fluido: fluidos[0],
    diametro: "",
    altura: "",
    aneis: numero_padrao_aneis,
    densidade: "",
    sobrespessuracasco: sobresspessuras_casco,
    largurachapa: larguras_chapa,
    declividade: "Para Periferia",
    material_casco: materiais_casco,
    constConversion: 1,
    unit: "m/mm",
  });

  // Efeito colateral para atualizar os arrays de materiais, sobrespessuras e larguras de chapa quando o número de anéis for alterado
  useEffect(() => {
    const aneis = parseInt(form.aneis) || 2;
  
    const pad = (arr, length, filler) => {
      const nova = [...arr];
      while (nova.length < length) nova.push(filler);
      return nova.slice(0, length); // se o usuário reduziu o número de anéis
    };
  
    setForm((prev) => ({
      ...prev,
      material_casco: pad(prev.material_casco, aneis, materiais[0]),
      sobrespessuracasco: pad(prev.sobrespessuracasco, aneis, 0),
      largurachapa: pad(prev.largurachapa, aneis, 0),
    }));
  }, [form.aneis]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleChangeList = (field, value, numero_anel) => {
    const oldList = [...form[field]]; // Lista de propriedade de interesse referente ao iésimo anel do casco (materiais, espessura de corrosão ou largura de chapa)
    let updatedList = [...oldList]; // Cria uma cópia da lista para evitar mutação direta
    updatedList[numero_anel] = value; // Atualiza a propriedade do anel específico
    setForm((prev) => ({ ...prev, [field]: updatedList}));
  }

  const handleCalcular = async () => {
    form.unit = isSI ? "m/mm" : "in/ft";
    form.constConversion = isSI ? 1 : 39.3701;
    const dados = await calcularPontoFixo(form);
    console.log("Resultado:", dados);
    if (dados !== undefined) {
      window.electronAPI.gerarPDF(dados);
    }
  };

  const [classeToggle, setToggle] = useState(
    "flex items-center justify-center px-4 py-2 w-16 h-8 bg-blue-600 rounded-full relative border-yellow-400 border-4"
  );

  const handleToggle = () => {
    setToggle(
      classeToggle ===
        "flex items-center justify-center px-4 py-2 w-16 h-8 bg-green-600 rounded-full relative border-yellow-400 border-4"
        ? "flex items-center justify-center px-4 py-2 w-16 h-8 bg-blue-600 rounded-full relative border-yellow-400 border-4"
        : "flex items-center justify-center px-4 py-2 w-16 h-8 bg-green-600 rounded-full relative border-yellow-400 border-4"
    );
  };

  const [classeToggleDiv, setToggleDiv] = useState(
    "h-7 w-7 bg-slate-100 rounded-full absolute transition-all duration-1200 ease-in-out -translate-x-4"
  );

  const handleToggleDiv = () => {
    setToggleDiv(
      classeToggleDiv ===
        "h-7 w-7 bg-slate-100 rounded-full absolute transition-all duration-1200 ease-in-out -translate-x-4"
        ? "h-7 w-7 bg-slate-100 rounded-full absolute transition-all duration-1200 ease-in-out translate-x-4"
        : "h-7 w-7 bg-slate-100 rounded-full absolute transition-all duration-1200 ease-in-out -translate-x-4"
    );
  };

  const [isSI, setIsSI] = useState(true);

  const [unitmeter, setUnitMeter] = useState("(m)");

  const [unitmilimiter, setUnitMilimiter] = useState("(mm)");

  const[unitmeter_feet, setUnitMeterFeet] = useState("(m)");

  const [sistemaUnidades, setsistemaUnidades] = useState(
    "Sistema Internacional de Unidades (SI)"
  );

  const handleToggleSI = () => {
    setIsSI(isSI === true ? false : true);
    setUnitMeter(isSI === true ? "(in)" : "(m)");
    setUnitMilimiter(isSI === true ? "(in)" : "(mm)");
    setUnitMeterFeet(isSI === true ? "(ft)" : "(m)");
    setsistemaUnidades(
      isSI === true
        ? "Sistema Inglês de Unidades"
        : "Sistema Internacional de Unidades (SI)"
    );
  };

  return (
    <div className="p-6 flex bg-gray-100 min-h-screen">
      <div className="w-1/12 flex flex-col p-1 bg-blue-600 items-center justify-center space-y-36">
        <Link to="/">
          <House className="w-12 h-12 text-white hover:cursor-pointer" />
        </Link>
        <Settings className="w-12 h-12 text-white hover:cursor-pointer" />
      </div>
      <div className="bg-white p-6 shadow-lg space-y-6 w-screen">
        <h1 className="text-4xl font-bold text-center">
          TankCalc Pro - Espessura Costado - Método Corpo da Norma - Ponto
          Fixo
        </h1>
        <Toggle
          className={classeToggle}
          onClick={() => {
            handleToggle();
            handleToggleDiv();
            handleToggleSI();
          }}
          classeToggleDiv={classeToggleDiv}
        />
        <h2 className="text-xl font-bold text-left">{sistemaUnidades}</h2>
        <h2 className="text-xl font-bold text-left">Dados Gerais</h2>
        <InfoPopover mensagem_info="Preencha os dados gerais do tanque e do fluido armazenado. Certifique-se de que todas as informações estejam corretas antes de prosseguir para o cálculo da espessura do
         costado. <br> <strong> Diâmetro Nominal:</strong> diâmetro interno do anel inferior do costado quando todas as chapas tiverem uma linha de centro comum, ou diâmetro interno do tanque quando as chapas tiverem a face interna comum. <br> 
         <strong> Altura Nominal: </strong> distância entre a face superior da chapa do fundo e o topo da cantoneira de reforço do último anel do costado, medida junto ao lado externo do costado. "
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="TAG"
            value={form.tag}
            onChange={(e) => handleChange("tag", e.target.value)}
          />
          <Select
            label="Fluido"
            value={form.fluido}
            onChange={(e) => handleChange("fluido", e.target.value)}
            options={fluidos}
          />
          <NumericFormat
            label={`Diâmetro Nominal ${unitmeter_feet}`}
            decimalSeparator=","
            thousandSeparator="."
            allowNegative={false}
            value={form.diametro}
            onValueChange={(values) => {
              const { floatValue } = values;
              handleChange("diametro", floatValue); // já é número pronto para cálculo
            }}
            customInput={InputWrapper} // seu componente Input customizado do shadcn/ui, MUI, etc.
          />
          <NumericFormat
            label={`Altura Nominal ${unitmeter_feet}`}
            decimalSeparator=","
            thousandSeparator="."
            allowNegative={false}
            value={form.altura}
            onValueChange={(values) => {
              const { floatValue } = values;
              handleChange("altura", floatValue);
            }}
            customInput={InputWrapper}
          />
          <NumericFormat
            label="Densidade Relativa Fluido"
            decimalSeparator=","
            thousandSeparator="."
            allowNegative={false}
            value={form.densidade}
            onValueChange={(values) => {
              const { floatValue } = values;
              handleChange("densidade", floatValue);
            }}
            customInput={InputWrapper}
          />
        </div>
        <h2 className="text-xl font-bold left">Casco</h2>
        <div className="grid grid-cols-1 gap-4">
          <Select
            label="Anéis"
            value={form.aneis}
            onChange={(e) => handleChange("aneis", e.target.value)}
            options={[2, 3, 4, 5, 6, 7, 8, 9, 10]}
          />
        </div>
        {Array.from({ length: form.aneis }).map((_, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label={`Material Anel ${i+1}`}
            value={form.material_casco[i]}
            onChange={(e) => handleChangeList("material_casco", e.target.value, i)}
            options={materiais}
          />
          <NumericFormat
            label={`Sobrespessura Corrosão Anel ${i+1} ${unitmilimiter}`}
            defaultValue={0}
            decimalSeparator=","
            thousandSeparator="."
            allowNegative={false}
            value={form.sobrespessuracasco[i]}
            onValueChange={(values) => {
              const { floatValue } = values;
              handleChangeList("sobrespessuracasco", floatValue, i);
            }}
            customInput={InputWrapper}
          />
          <NumericFormat
            label={`Largura Chapa Anel ${i+1} ${unitmeter}`}
            defaultValue={0}
            decimalSeparator=","
            thousandSeparator="."
            allowNegative={false}
            value={form.largurachapa[i]}
            onValueChange={(values) => {
              const { floatValue } = values;
              handleChangeList("largurachapa", floatValue, i);
            }}
            customInput={InputWrapper}
          />
 
        </div>))}
        <div className="flex justify-end">
          <Button onClick={handleCalcular}>Calcular</Button>
        </div>
      </div>
    </div>
  );
}
