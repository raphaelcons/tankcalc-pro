import * as XLSX from "xlsx";
import espessuraExcessivaMaterial from "./espessuraExcessivaMaterial";
import sanitizeInput from "./sanitizeInput";
import formatar from "./formatarfloat";
export default async function calcularPontoFixo(dados) {
  let memoria = []; // Memória para armazenar os resultados de cada anel calculado
  let itens_eq = [];
  let valores_eq = [];
  let espessuras_casco_d = []; // Espessuras do casco calculadas com base na tensão de projeto
  let espessuras_casco_t = []; // Espessuras do casco calculadas com base na tensão de teste hidrostático
  
  // --- Helpers de conversão / parsing limpa ---
  const isImperial = dados.unit === "in/ft";
  const toMillimeterFromInchFactor = isImperial ? 25.4 : 1; // se entrada em in => 1 in = 25.4 mm
  const toMeterFromFeetFactor = isImperial ? 0.3048 : 1; // se entrada em ft => *0.3048 => m
  const toMeterfromMillimeterFactor = isImperial ? 1000 : 1; // se entrada em mm => 1000 mm = 1 m
  // Se você recebe H e D já em metros quando metric, mantemos 1
  
  const parseNumber = (v, defaultVal = 0) => {
    if (v === null || v === undefined) return defaultVal;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : defaultVal;
  };


  const numRings = parseInt(dados.aneis, 10) || 0;
  if (numRings <= 0) throw new Error("Quantidade de anéis inválida.");
  const metodo = "Ponto Fixo";
  let msg_diametro_excessivo = "Nenhuma"; // Aviso de diâmetro excessivo (> 61 m), conforme item 5.6.3.1 da API 650
  
  const H = parseNumber(dados.altura) * toMeterFromFeetFactor;
  const D = parseNumber(dados.diametro) * toMeterFromFeetFactor;
  const G = parseNumber(dados.densidade); // Densidade relativa do fluido
  
  if (D > 61)
    msg_diametro_excessivo =
      "Diâmetro maior que 61 m, método do ponto fixo não pode ser utilizado, conforme item 5.6.3.1 da API 650!"; // 5.6.3.1 da API 650

  // normalizar arrays de entrada: sobrespessuracasco (assume em mm ou in dependendo de "unit")
  const Ca_casco = (dados.sobrespessuracasco || []).slice(0, numRings).map((v) => {
    // Se entrada em polegadas (imperial) presume-se que valor vem em "in"
    // Aqui assumimos que sobrespessura está em mm se metric, in se imperial.
    const raw = parseNumber(v, 0);
    return raw * toMillimeterFromInchFactor; // converte para mm internamente
  });

  // largura da chapa presumida em metros (se imperial vem em in)
  const larguraChapaCasco = (dados.largurachapa || []).slice(0, numRings).map((v) => {
    const raw = parseNumber(v, 0);
    return raw * toMillimeterFromInchFactor / toMeterfromMillimeterFactor // mm para m
    // Se já estiver em metros, fica igual, caso contrário, converte de in para m
  });

  const tag = dados.tag || "Não informado";

  const material_casco = dados.material_casco;
  const fluido = dados.fluido;

  const msg_sanitizeInput = sanitizeInput(H, D, G, Ca_casco, larguraChapaCasco);

  if (msg_sanitizeInput !== true) {
    window.electronAPI.badInputAlert(msg_sanitizeInput);
    return undefined;
  }

  let espessuras_casco = [];
  let espessuras_casco_alertas = []; // Aviso para caso de espessura excessiva conforme item 4.2.2 da API 650

  function espessuraMinimaCasco(D) {
    // item 5.6.1.1 da API 650
    if (D < 15) return 5;
    else if (D < 36) return 6;
    else if (D <= 60) return 8;
    else return 10;
  }

  // Ler o arquivo Excel

  async function lerArquivoExcel() {
    const buffer = await window.electronAPI.getExcelBuffer();

    const wb = XLSX.read(buffer, { type: "array" });

    const nome_primeira_planilha = wb.SheetNames[0];
    const ws = wb.Sheets[nome_primeira_planilha];
    const tabela = XLSX.utils.sheet_to_json(ws);

    return tabela;
  }

  // Chamar a função para ler o arquivo Excel

  const tabela = await lerArquivoExcel();

  let Sd = []; // Lista de tensões de projeto (MPa) do material do casco
  let St = []; // Lista de tensões de teste hidrostático (MPa) do material do casco

  for (let i = 0; i < numRings; i++) { // iteração para cada anel do casco
  for (let linha = 0; linha <= tabela.length; linha++) { // iteração para cada linha da tabela    
    if (tabela[linha].Especificacao_Chapa_ASTM == material_casco[i]) {
      Sd.push(parseFloat(tabela[linha].Produto_de_Tensao_de_Projeto_MPa)); // Tensão de produto de projeto (MPa) do material da chapa do iésimo anel do casco
      St.push(parseFloat(tabela[linha].Tensao_de_Teste_Hidrostatico_MPa)); // Tensão de produto de teste hidrostático (MPa) do material da chapa do iésimo anel do casco
      break;
    }
  }
}

  // Função Auxiliar: soma os elementos de um array até seu iésimo elemento
  function somarAteIndice(array, indice) {
    let sum = 0;
    for (let i = 0; i < indice; i++) {
      sum += array[i];
    }
    return sum;
  }

  for (let i = 0; i < numRings; i++) { // iteração para cada anel do casco
    // Item 5.6.3.2 da API 650
    let espessura_d =
      (4.9 * D * (H - somarAteIndice(larguraChapaCasco, i) - 0.3) * G) / Sd[i] + Ca_casco[i];
    let espessura_t = (4.9 * D * (H - somarAteIndice(larguraChapaCasco, i) - 0.3)) / St[i];
    let esp = Math.max(espessura_d, espessura_t); // Espessura do casco em mm
    const equacao_Nota4 = (D < 15 && i == 0 && esp < 6 )
    let tmin = espessuraMinimaCasco(D);
    if (esp < tmin) esp = tmin;
    if (D < 15 && i == 0 && esp < 6) esp = 6; // Nota 4 do item 5.6.1.2 do API 650, se D < 15 m, a espessura mínima do primeiro anel é 6 mm

    
    espessuras_casco_alertas.push(espessuraExcessivaMaterial(esp, material_casco[i]));

    let altura_liquido = H - somarAteIndice(larguraChapaCasco, i);

    espessuras_casco_d.push(espessura_d); // Espessura do casco calculada com base na tensão de projeto
    espessuras_casco_t.push(espessura_t); // Espessura do casco calculada com base na tensão de teste hidrostático

    espessuras_casco.push(esp);


    if (i === 0 && msg_diametro_excessivo === 'Nenhuma' && equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "5.6.3(d)", "5.6.3(t)", "5.6.3", "NOTA 4 - item 5.6.1.2"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco_d[i]), formatar(espessuras_casco_t[i]), formatar(espessuras_casco[i]), formatar(espessuras_casco[i])]); // valor da equação calculada
    }
    else if (i === 0 && msg_diametro_excessivo === 'Nenhuma' && !equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "5.6.3(d)", "5.6.3(t)", "5.6.3"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco_d[i]), formatar(espessuras_casco_t[i]), formatar(espessuras_casco[i])]); // valor da equação calculada
    }
    else if (i === 0 && msg_diametro_excessivo !== 'Nenhuma' && equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "5.6.3(d)", "5.6.3(t)", "5.6.3", "NOTA 4 - item 5.6.1.2", "5.6.3.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco_d[i]), formatar(espessuras_casco_t[i]), formatar(espessuras_casco[i], formatar(espessuras_casco[i]), "NA")]); // valor da equação calculada
    }
    else if (i === 0 && msg_diametro_excessivo !== 'Nenhuma' && !equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "5.6.3(d)", "5.6.3(t)", "5.6.3", "5.6.3.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco_d[i]), formatar(espessuras_casco_t[i]), formatar(espessuras_casco[i], "NA")]); // valor da equação calculada
    }
    else if (i != 0 && msg_diametro_excessivo === 'Nenhuma') {
      itens_eq.push(["Anel N", "5.6.3(d)", "5.6.3(t)", "5.6.3"]);
      valores_eq.push([`Anel ${i+1}`, formatar(espessuras_casco_d[i]), formatar(espessuras_casco_t[i]), formatar(espessuras_casco[i])]); // valor da equação calculada
    }
    else if (i != 0 && msg_diametro_excessivo !== 'Nenhuma') {
      itens_eq.push(["Anel N", "5.6.1", "5.6.3(d)", "5.6.3(t)", "5.6.3", "5.6.3.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco_d[i]), formatar(espessuras_casco_t[i]), formatar(espessuras_casco[i], "NA")]); // valor da equação calculada
    }

    memoria.push({
      anel: i + 1,
      altura_liquido: formatar(altura_liquido),
      t_calc: formatar(espessuras_casco[i]), // Espessura calculada do casco (mm)
      ca: formatar(Ca_casco[i], true), // true para considerar zero por padrão
      material_casco: material_casco[i],
      espessura_excessiva_material: espessuras_casco_alertas[i],
      tensao_projeto: Sd[i],
      tensao_hidrostatico: St[i],
      item_equacao: itens_eq[i],
      valor_equacao: valores_eq[i], // valor da equação calculada
});


  if (msg_diametro_excessivo !== "Nenhuma") break;

  }

  return {
    inputs: {
      metodo: metodo,
      unidade: dados.unit,
      tag: tag,
      fluido: fluido,
      altura_nominal: dados.altura.toFixed(2),
      diametro_nominal: dados.diametro.toFixed(2),
      densidade_relativa_fluido: dados.densidade.toFixed(2),
      eficiencia_junta: "NA",
      quantidade_aneis: numRings,
      sobrespessura_corrosao: dados.sobrespessuracasco.map((ca) => formatar(ca, true)), // true para considerar zero por padrão
      material_casco: material_casco,
      largurachapa: dados.largurachapa.map((largura) => formatar(largura)),
    },
    resultados: {
      espessuras_requeridas_aneis: espessuras_casco.map((esp, i) => ({
        anel: i + 1,
        espessura: esp.toFixed(2),
      })),
      espessuras_requeridas_materiais_alerta: espessuras_casco_alertas.map(
        (alert, i) => ({
          anel: i + 1,
          alerta_espessura: alert,
        })
      ),
    },
    alertas: {
      // Adicione aqui os alertas, se necessário
      msg_alerta_geral: msg_diametro_excessivo,
    },
    memoria: memoria
    };
}
