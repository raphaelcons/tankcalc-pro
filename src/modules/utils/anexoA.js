import espessuraExcessivaMaterial from "./espessuraExcessivaMaterial";
import sanitizeInput from "./sanitizeInput";
import formatar from "./formatarfloat";

export default async function anexoA(dados) {
  let memoria = []; // Memória para armazenar os resultados de cada anel calculado
  let itens_eq = [];
  let valores_eq = [];
  
  // --- Helpers de conversão / parsing limpa ---
  const isImperial = dados.unit === "in/ft";
  const toMillimeterFromInchFactor = isImperial ? 25.4 : 1; // se entrada em in => 1 in = 25.4 mm
  const toMeterFromFeetFactor = isImperial ? 0.3048 : 1; // se entrada em ft => *0.3048 => m
  const toMeterfromMillimeterFactor = isImperial ? 1000 : 1; // se entrada em mm => 1000 mm = 1 m
  // Se você recebe H e D já em metros quando metric, mantemos 1

  const numRings = parseInt(dados.aneis, 10) || 0;
  if (numRings <= 0) throw new Error("Quantidade de anéis inválida.");

  const parseNumber = (v, defaultVal = 0) => {
    if (v === null || v === undefined) return defaultVal;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : defaultVal;
  };

  const metodo = "Anexo A";
  
  const H = parseNumber(dados.altura) * toMeterFromFeetFactor;
  const D = parseNumber(dados.diametro) * toMeterFromFeetFactor;
  const G = parseNumber(dados.densidade) <= 1 ? 1 : parseNumber(dados.densidade); // Densidade relativa do fluido // A.4.1 da API 650

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
  const E = dados.eficiencia;
  const material_casco = dados.material_casco;
  const fluido = dados.fluido;

  const msg_sanitizeInput = sanitizeInput(H, D, G, Ca_casco, larguraChapaCasco);

  if (msg_sanitizeInput !== true) {
    window.electronAPI.badInputAlert(msg_sanitizeInput);
    return undefined;
  } 

  let espessuras_casco = [];
  let espessuras_casco_alertas = []; // Aviso para caso de espessura excessiva do material conforme item 4.2.2 da API 650
  let msg_espessura_excessiva = "Nenhuma"; // Aviso geral e único para o equipamento como um todo para caso de qualquer anel do casco ter espessura excessiva (> 13 mm) conforme item A.1.1 da API 650

  // Função Auxiliar: soma os elementos de um array até seu iésimo elemento
  function somarAteIndice(array, indice) {
    let sum = 0;
    for (let i = 0; i < indice; i++) {
      sum += array[i];
    }
    return sum;
  }

  function espessuraMinimaCasco(D) {
    // item 5.6.1.1 da API 650
    if (D < 15) return 5;
    else if (D < 36) return 6;
    else if (D <= 60) return 8;
    else return 10;
  }

  let tmin = espessuraMinimaCasco(D);

  // Cálculo das espessuras dos anéis do casco

  for (let i = 0; i < numRings; i++) { // (i+1) é o número do anel
    // Item A.4.1 da API 650
    let esp =
      (4.9 * D * (H - somarAteIndice(larguraChapaCasco, i) - 0.3) * G) / (E * 145) + Ca_casco[i];
    let equacao_Nota4 = (D < 15 && i == 0 && esp < 6 );
    if (esp < tmin) esp = tmin;
    if (D < 15 && i == 0 && esp <= 6) esp = 6; // Nota 4 do item 5.6.1.2 do API 650, se D < 15 m, a espessura mínima do primeiro anel é 6 mm
    if (esp > 13) { // Item A.1.1 da API 650
      msg_espessura_excessiva =
        "Espessura de um ou mais anéis do tanque maior que 13 mm, o método do Anexo A da API 650 não é adequado conforme item A.1.1 desta norma!";
    }

    espessuras_casco_alertas.push(espessuraExcessivaMaterial(esp, material_casco[i]));

    espessuras_casco.push(esp);

    let altura_liquido = H - somarAteIndice(larguraChapaCasco, i);
    
    if (i === 0 && msg_espessura_excessiva === 'Nenhuma' && equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "A.4.1", "NOTA 4 - item 5.6.1.2"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco[i]), formatar(espessuras_casco[i])]); // valor da equação calculada
    }
    else if (i === 0 && msg_espessura_excessiva === 'Nenhuma' && !equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "A.4.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco[i])]); // valor da equação calculada
    }
    else if (i === 0 && msg_espessura_excessiva !== 'Nenhuma' && equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "A.4.1", "NOTA 4 - item 5.6.2.1", "A.1.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco[i], formatar(espessuras_casco[i]), "NA")]); // valor da equação calculada
    }
    else if (i === 0 && msg_espessura_excessiva !== 'Nenhuma' && !equacao_Nota4) {
      itens_eq.push(["Anel N", "5.6.1", "A.4.1", "A.1.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco[i]), "NA"]); // valor da equação calculada
    }
    else if (i != 0 && msg_espessura_excessiva === 'Nenhuma') {
      itens_eq.push(["Anel N", "A.4.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(espessuras_casco[i])]); // valor da equação calculada
    }
    else if (i != 0 && msg_espessura_excessiva !== 'Nenhuma') {
      itens_eq.push(["Anel N", "5.6.1", "A.4.1", "A.1.1"]);
      valores_eq.push([`Anel ${i+1}`, formatar(tmin), formatar(espessuras_casco[i], "NA")]); // valor da equação calculada
    }

    memoria.push({
      anel: i + 1,
      altura_liquido: formatar(altura_liquido),
      t_calc: formatar(espessuras_casco[i]), // Espessura calculada do casco (mm)
      ca: formatar(Ca_casco[i], true), // true para considerar zero por padrão
      material_casco: material_casco[i],
      espessura_excessiva_material: espessuras_casco_alertas[i],
      item_equacao: itens_eq[i],
      valor_equacao: valores_eq[i], // valor da equação calculada
});
  
  if (msg_espessura_excessiva !== "Nenhuma") break;
  };
  

  return {
    inputs: {
      metodo: metodo,
      unidade: dados.unit,
      tag: tag,
      fluido: fluido,
      altura_nominal: formatar(dados.altura),
      diametro_nominal: formatar(dados.diametro),
      densidade_relativa_fluido: formatar(dados.densidade),
      eficiencia_junta: E,
      quantidade_aneis: numRings,
      sobrespessura_corrosao: dados.sobrespessuracasco.map((ca) => formatar(ca, true)), // true para considerar zero por padrão
      material_casco: material_casco,
      largurachapa: dados.largurachapa.map((largura) => formatar(largura)),
    },
    resultados: {
      espessuras_requeridas_aneis: espessuras_casco.map((esp, i) => ({
        anel: i + 1,
        espessura: formatar(esp),
      })),
      espessuras_requeridas_materiais_alerta: espessuras_casco_alertas.map(
        (alert, i) => ({
          anel: i + 1,
          alerta_espessura: alert,
        })
      ),
    },
    alertas: {
      msg_alerta_geral: msg_espessura_excessiva,
    },
    memoria: memoria,
  };
}
