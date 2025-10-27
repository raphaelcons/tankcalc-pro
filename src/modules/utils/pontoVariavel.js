import * as XLSX from "xlsx";
import espessuraExcessivaMaterial from "./espessuraExcessivaMaterial";
import sanitizeInput from "./sanitizeInput";
import formatar from "./formatarfloat";

export default async function calcularPontoVariavel(dados) {
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

  const metodo = "Ponto Variável";
  let msg_requisito_diametro_altura = "Nenhuma";

  // --- Entradas principais ---
  const tag = dados.tag || "Não informado";
  const numRings = parseInt(dados.aneis, 10) || 0;
  if (numRings <= 0) throw new Error("Quantidade de anéis inválida.");

  // converter altura/diâmetro para metros (interno)
  const H = parseNumber(dados.altura) * toMeterFromFeetFactor;
  const D = parseNumber(dados.diametro) * toMeterFromFeetFactor;
  const G = parseNumber(dados.densidade);

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


  // sanitizeInput - assume que retorna true ou mensagem de erro
  const msg_sanitizeInput = sanitizeInput(H, D, G, Ca_casco, larguraChapaCasco);
  if (msg_sanitizeInput !== true) {
    window.electronAPI.badInputAlert(msg_sanitizeInput);
    return undefined;
  }


  // --- Ler Planilha (com try/catch) ---
  async function lerArquivoExcel() {
    try {
      const buffer = await window.electronAPI.getExcelBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const tabela = XLSX.utils.sheet_to_json(ws, { defval: "" });
      return tabela;
    } catch (err) {
      window.electronAPI.badInputAlert("Erro ao ler planilha: " + (err.message || err));
      throw err;
    }
  }

  const tabela = await lerArquivoExcel();

  // --- Mapear materiais (tensões) com busca case-insensitive e trim ---
  const Sd = new Array(numRings).fill(null);
  const St = new Array(numRings).fill(null);
  const material_casco = dados.material_casco || [];

  for (let i = 0; i < numRings; i++) {
    const matAlvo = String(material_casco[i] || "").trim().toLowerCase();
    let achou = false;
    for (let linha = 0; linha < tabela.length; linha++) {
      const especificacao = String(tabela[linha].Especificacao_Chapa_ASTM || "").trim().toLowerCase();
      if (!especificacao) continue;
      if (especificacao === matAlvo) {
        Sd[i] = parseNumber(tabela[linha].Produto_de_Tensao_de_Projeto_MPa, NaN);
        St[i] = parseNumber(tabela[linha].Tensao_de_Teste_Hidrostatico_MPa, NaN);
        achou = true;
        break;
      }
    }
    if (!achou) {
      // se não encontrou, em vez de quebrar, coloca NaN e continua — vamos validar depois
      Sd[i] = NaN;
      St[i] = NaN;
      console.warn(`Material ${material_casco[i]} não encontrado na planilha (anel ${i+1}).`);
    }
  }

  // validação final das tensões
  for (let i = 0; i < numRings; i++) {
    if (!Number.isFinite(Sd[i]) || !Number.isFinite(St[i])) {
      window.electronAPI.badInputAlert(`Não foi possível obter Sd/St para o material do anel ${i+1}: ${material_casco[i]}`);
      return undefined;
    }
  }

  // --- Funções auxiliares internas ---
  function espessuraMinimaCasco(D_metros) {
    if (D_metros < 15) return 5;
    else if (D_metros < 36) return 6;
    else if (D_metros <= 60) return 8;
    else return 10;
  }

  function somarAteIndice(array, indice) {
    let sum = 0;
    for (let i = 0; i < indice && i < array.length; i++) {
      sum += Number(array[i]) || 0;
    }
    return sum;
  }

  // metodoIterativo seguro com limite de iterações
  function metodoIterativo(t1_corroded, r, Hlocal, S, Ca_casco_local, caso, D_local, G_local) {
    let t2a = 0;
    let tu = 0;
    let tl = t1_corroded;
    let delta = 1;
    let iter = 0;
    const maxIter = 200; // opinião: 200 é razoável; ajuste se necessário
    const historico = {
      t2a: [],
      tu: [],
      tl: [],
      K: [],
      C: [],
      x1: [],
      x2: [],
      x3: [],
      x: [],
      iter: []
    };

    while (delta > 0.254 && iter < maxIter) {
      if (t2a === 0) {
        if (caso === "Projeto") {
          tu = (4.9 * D_local * (Hlocal - 0.3) * G_local) / S;
        } else {
          tu = (4.9 * D_local * (Hlocal - 0.3)) / S;
        }
      } else {
        tu = caso === "Projeto" ? t2a - Ca_casco_local : t2a;
      }

      const K = tl / tu;
      const C = (Math.sqrt(K) * (K - 1)) / (1 + Math.pow(K, 1.5));
      const x1 = 0.61 * Math.sqrt(r * tu) + 320 * C * Hlocal;
      const x2 = 1000 * C * Hlocal;
      const x3 = 1.22 * Math.sqrt(r * tu);
      const x = Math.min(x1, x2, x3);

      if (caso === "Projeto") {
        t2a = (4.9 * D_local * (Hlocal - x / 1000) * G_local) / S + Ca_casco_local;
      } else {
        t2a = (4.9 * D_local * (Hlocal - x / 1000)) / S;
      }

      delta = caso === "Projeto" ? Math.abs((t2a - Ca_casco_local) - tu) : Math.abs(t2a - tu);

      historico.t2a.push(t2a);
      historico.tu.push(tu);
      historico.tl.push(tl);
      historico.K.push(K);
      historico.C.push(C);
      historico.x1.push(x1);
      historico.x2.push(x2);
      historico.x3.push(x3);
      historico.x.push(x);
      historico.iter.push(iter);

      iter++;
    }

    if (iter >= maxIter) {
      console.warn("metodoIterativo: atingiu maxIter antes da convergência.");
    }

    // Para caso Projeto, subtrair Ca_casco na saída t2a para manter consistência do seu código original
    return {
      t2a: caso === "Projeto" ? t2a - Ca_casco_local : t2a,
      tx: historico.t2a,
      tu: historico.tu,
      tl: historico.tl,
      K: historico.K,
      C: historico.C,
      x1: historico.x1,
      x2: historico.x2,
      x3: historico.x3,
      x: historico.x,
      iterArr: historico.iter
    };
  }

  // --- Variáveis de saída/estado ---
  const memoria = [];
  const espessuras_casco = [];
  const espessuras_teste_hidrostatico = [];
  const espessuras_projeto = [];
  const espessuras_casco_alertas = [];
  const itens_eq = [];
  const valores_eq = [];
  const espessuras_casco_d = [];
  const espessuras_casco_t = [];

  // --- Loop principal por anel ---
  for (let i = 0; i < numRings; i++) {
    // garantias locais
    const Ca_local = Ca_casco[i] || 0; // mm
    const chapaWidth = larguraChapaCasco[i] || 0; // m
    // prepara arrays de equação para este anel
    itens_eq.push([]);
    valores_eq.push([]);
    const idx = itens_eq.length - 1;

    if (i === 0) {
      // primeiro anel (item 5.6.3.2 / 5.6.4.4)
      const Sd_local = Sd[i];
      const St_local = St[i];

      const t1pd = (4.9 * D * (H - 0.3) * G) / Sd_local + Ca_local;
      const t1d =
        ((1.06 - ((0.069 * D) / H) * Math.sqrt((H * G) / Sd_local)) *
          (4.9 * H * D * G)) /
          Sd_local +
        Ca_local;
      const t1d_final = Math.min(t1d, t1pd);

      const t1pt = (4.9 * D * (H - 0.3)) / St_local;
      const t1t =
        ((1.06 - ((0.069 * D) / H) * Math.sqrt(H / St_local)) * (4.9 * H * D)) /
        St_local;
      const t1t_final = Math.min(t1t, t1pt);

      let t1 = Math.max(t1d_final, t1t_final);

      let tmin = espessuraMinimaCasco(D);
      if (t1 < tmin) t1 = tmin;
      if (D < 15 && t1 < 6) t1 = 6;

      // verificação item 5.6.4.1
      const L = Math.sqrt(500 * D * (t1 - Ca_local));
      if (L / H > 1000 / 6) {
        msg_requisito_diametro_altura =
          "Atenção! O tanque não atende aos requisitos do item 5.6.4.1 da API 650!";
      }

      espessuras_projeto.push(t1d_final);
      espessuras_teste_hidrostatico.push(t1t_final);
      espessuras_casco.push(t1);
      espessuras_casco_d.push(t1d_final);
      espessuras_casco_t.push(t1t_final);
      espessuras_casco_alertas.push(espessuraExcessivaMaterial(t1, material_casco[i]));

      // preencher itens_eq / valores_eq
      itens_eq[idx].push("Anel N"); valores_eq[idx].push(`Anel ${i+1}`);
      itens_eq[idx].push("5.6.1"); valores_eq[idx].push(formatar(tmin));
      itens_eq[idx].push("5.6.3.2(d)"); valores_eq[idx].push(formatar(t1pd));
      itens_eq[idx].push("5.6.3.2(t)"); valores_eq[idx].push(formatar(t1pt));
      itens_eq[idx].push("5.6.4.4(d)"); valores_eq[idx].push(formatar(t1d));
      itens_eq[idx].push("5.6.4.4(t)"); valores_eq[idx].push(formatar(t1t));
      itens_eq[idx].push("5.6.4.1"); valores_eq[idx].push(formatar(L / H));
      itens_eq[idx].push("5.6.4"); valores_eq[idx].push(formatar(t1));

      if (msg_requisito_diametro_altura !== "Nenhuma") {
        itens_eq[idx].push("5.6.4.1(fail)"); valores_eq[idx].push("NA");
      }

      const altura_liquido = H - somarAteIndice(larguraChapaCasco, i);
      memoria.push({
        anel: i + 1,
        altura_liquido: formatar(altura_liquido),
        t_calc: formatar(t1),
        ca: formatar(Ca_local, true),
        material_casco: material_casco[i],
        espessura_excessiva_material: espessuras_casco_alertas[i],
        tensao_projeto: Sd[i],
        tensao_hidrostatico: St[i],
        item_equacao: itens_eq[idx],
        valor_equacao: valores_eq[idx],
      });

      if (msg_requisito_diametro_altura !== "Nenhuma") break;
    } else if (i === 1) {
      // segundo anel (item 5.6.4.5 e derivados)
      itens_eq[idx].push("Anel N"); valores_eq[idx].push(`Anel ${i+1}`);

      const Hanel = H - somarAteIndice(larguraChapaCasco, i);
      const h1 = (larguraChapaCasco[0] || 0) * 1000; // mm
      const r = (D / 2) * 1000; // mm

      // Condição Projeto
      let t1 = espessuras_projeto[i-1];
      let t1_corroded = t1 - Ca_casco[i-1];
      let caso = "Projeto";

      const Ratiod = h1 / Math.sqrt(r * t1_corroded);
      let t2d;
      if (Ratiod <= 1.375) {
        t2d = t1;
      } else if (Ratiod > 1.375 && Ratiod < 2.625) {
        const res = metodoIterativo(t1_corroded, r, Hanel, Sd[i], Ca_local, caso, D, G);
        t2d = res.t2a + (t1_corroded - res.t2a) * (2.1 - h1 / (1.25 * Math.sqrt(r * t1_corroded)));
        // grava histórico de iterações
        for (let k = 0; k < res.iterArr.length; k++) {
          itens_eq[idx].push("5.6.4.6(n)"); valores_eq[idx].push(res.iterArr[k]);
          itens_eq[idx].push("5.6.4.6(tu)"); valores_eq[idx].push(formatar(res.tu[k]));
          itens_eq[idx].push("5.6.4.6(tl)"); valores_eq[idx].push(formatar(res.tl[k]));
          itens_eq[idx].push("5.6.4.6(K)"); valores_eq[idx].push(formatar(res.K[k]));
          itens_eq[idx].push("5.6.4.6(C)"); valores_eq[idx].push(formatar(res.C[k]));
          itens_eq[idx].push("5.6.4.6(x1)"); valores_eq[idx].push(formatar(res.x1[k]));
          itens_eq[idx].push("5.6.4.6(x2)"); valores_eq[idx].push(formatar(res.x2[k]));
          itens_eq[idx].push("5.6.4.6(x3)"); valores_eq[idx].push(formatar(res.x3[k]));
          itens_eq[idx].push("5.6.4.6(x)"); valores_eq[idx].push(formatar(res.x[k]));
          itens_eq[idx].push("5.6.4.7(d)"); valores_eq[idx].push(formatar(res.tx[k]));
        }
      } else { // Ratiod >= 2.625
        const res = metodoIterativo(t1_corroded, r, Hanel, Sd[i], Ca_local, caso, D, G);
        t2d = res.t2a;
        for (let k = 0; k < res.iterArr.length; k++) {
          itens_eq[idx].push("5.6.4.6(n)"); valores_eq[idx].push(res.iterArr[k]);
          itens_eq[idx].push("5.6.4.6(tu)"); valores_eq[idx].push(formatar(res.tu[k]));
          itens_eq[idx].push("5.6.4.6(tl)"); valores_eq[idx].push(formatar(res.tl[k]));
          itens_eq[idx].push("5.6.4.6(K)"); valores_eq[idx].push(formatar(res.K[k]));
          itens_eq[idx].push("5.6.4.6(C)"); valores_eq[idx].push(formatar(res.C[k]));
          itens_eq[idx].push("5.6.4.6(x1)"); valores_eq[idx].push(formatar(res.x1[k]));
          itens_eq[idx].push("5.6.4.6(x2)"); valores_eq[idx].push(formatar(res.x2[k]));
          itens_eq[idx].push("5.6.4.6(x3)"); valores_eq[idx].push(formatar(res.x3[k]));
          itens_eq[idx].push("5.6.4.6(x)"); valores_eq[idx].push(formatar(res.x[k]));
          itens_eq[idx].push("5.6.4.7(d)"); valores_eq[idx].push(formatar(res.tx[k]));
        }
      }
      t2d = t2d + Ca_local;
      espessuras_projeto.push(t2d);

      // Condição Teste Hidrostatico
      caso = "TH";
      t1 = espessuras_teste_hidrostatico[i-1];
      t1_corroded = t1;
      const Ratiot = h1 / Math.sqrt(r * t1_corroded);
      let t2t;
      if (Ratiot <= 1.375) {
        t2t = t1;
      } else if (Ratiot > 1.375 && Ratiot < 2.625) {
        const res = metodoIterativo(t1_corroded, r, Hanel, St[i], Ca_local, caso, D, G);
        t2t = res.t2a + (t1_corroded - res.t2a) * (2.1 - h1 / (1.25 * Math.sqrt(r * t1_corroded)));
        for (let k = 0; k < res.iterArr.length; k++) {
          itens_eq[idx].push("5.6.4.6(n)"); valores_eq[idx].push(res.iterArr[k]);
          itens_eq[idx].push("5.6.4.6(tu)"); valores_eq[idx].push(formatar(res.tu[k]));
          itens_eq[idx].push("5.6.4.6(tl)"); valores_eq[idx].push(formatar(res.tl[k]));
          itens_eq[idx].push("5.6.4.6(K)"); valores_eq[idx].push(formatar(res.K[k]));
          itens_eq[idx].push("5.6.4.6(C)"); valores_eq[idx].push(formatar(res.C[k]));
          itens_eq[idx].push("5.6.4.6(x1)"); valores_eq[idx].push(formatar(res.x1[k]));
          itens_eq[idx].push("5.6.4.6(x2)"); valores_eq[idx].push(formatar(res.x2[k]));
          itens_eq[idx].push("5.6.4.6(x3)"); valores_eq[idx].push(formatar(res.x3[k]));
          itens_eq[idx].push("5.6.4.6(x)"); valores_eq[idx].push(formatar(res.x[k]));
          itens_eq[idx].push("5.6.4.7(t)"); valores_eq[idx].push(formatar(res.tx[k]));
        }
      } else {
        const res = metodoIterativo(t1_corroded, r, Hanel, St[i], Ca_local, caso, D, G);
        t2t = res.t2a;
        for (let k = 0; k < res.iterArr.length; k++) {
          itens_eq[idx].push("5.6.4.6(n)"); valores_eq[idx].push(res.iterArr[k]);
          itens_eq[idx].push("5.6.4.6(tu)"); valores_eq[idx].push(formatar(res.tu[k]));
          itens_eq[idx].push("5.6.4.6(tl)"); valores_eq[idx].push(formatar(res.tl[k]));
          itens_eq[idx].push("5.6.4.6(K)"); valores_eq[idx].push(formatar(res.K[k]));
          itens_eq[idx].push("5.6.4.6(C)"); valores_eq[idx].push(formatar(res.C[k]));
          itens_eq[idx].push("5.6.4.6(x1)"); valores_eq[idx].push(formatar(res.x1[k]));
          itens_eq[idx].push("5.6.4.6(x2)"); valores_eq[idx].push(formatar(res.x2[k]));
          itens_eq[idx].push("5.6.4.6(x3)"); valores_eq[idx].push(formatar(res.x3[k]));
          itens_eq[idx].push("5.6.4.6(x)"); valores_eq[idx].push(formatar(res.x[k]));
          itens_eq[idx].push("5.6.4.7(t)"); valores_eq[idx].push(formatar(res.tx[k]));
        }
      }

      espessuras_teste_hidrostatico.push(t2t);
      let t2 = Math.max(t2d, t2t);
      let tmin = espessuraMinimaCasco(D);
      if (t2 < tmin) t2 = tmin;

      espessuras_casco.push(t2);
      espessuras_casco_alertas.push(espessuraExcessivaMaterial(t2, material_casco[i]));
      espessuras_casco_d.push(t2d);
      espessuras_casco_t.push(t2t);

      itens_eq[idx].push("5.6.1"); valores_eq[idx].push(formatar(tmin));
      itens_eq[idx].push("5.6.4.1(ratio)(d)"); valores_eq[idx].push(formatar(Ratiod));
      itens_eq[idx].push("5.6.4.1(ratio)(t)"); valores_eq[idx].push(formatar(Ratiot));

      // registro de resultado
      const altura_liquido = H - somarAteIndice(larguraChapaCasco, i);
      memoria.push({
        anel: i + 1,
        altura_liquido: formatar(altura_liquido),
        t_calc: formatar(t2),
        ca: formatar(Ca_local, true),
        material_casco: material_casco[i],
        espessura_excessiva_material: espessuras_casco_alertas[i],
        tensao_projeto: Sd[i],
        tensao_hidrostatico: St[i],
        item_equacao: itens_eq[idx],
        valor_equacao: valores_eq[idx],
      });
    } else {
      // anéis subsequentes (i >= 2)
      itens_eq[idx].push("Anel N"); valores_eq[idx].push(`Anel ${i+1}`);

      const Hanel = H - somarAteIndice(larguraChapaCasco, i);
      const r = (D / 2) * 1000;

      // Projeto
      const t1 = espessuras_projeto[i-1];
      const t1_corroded = t1 - Ca_casco[i-1];

      const resProj = metodoIterativo(t1_corroded, r, Hanel, Sd[i], Ca_local, "Projeto", D, G);
      const t2d = resProj.t2a + Ca_local;
      espessuras_projeto.push(t2d);
      for (let k = 0; k < resProj.iterArr.length; k++) {
        itens_eq[idx].push("5.6.4.6(n)"); valores_eq[idx].push(resProj.iterArr[k]);
        itens_eq[idx].push("5.6.4.6(tu)"); valores_eq[idx].push(formatar(resProj.tu[k]));
        itens_eq[idx].push("5.6.4.6(tl)"); valores_eq[idx].push(formatar(resProj.tl[k]));
        itens_eq[idx].push("5.6.4.6(K)"); valores_eq[idx].push(formatar(resProj.K[k]));
        itens_eq[idx].push("5.6.4.6(C)"); valores_eq[idx].push(formatar(resProj.C[k]));
        itens_eq[idx].push("5.6.4.6(x1)"); valores_eq[idx].push(formatar(resProj.x1[k]));
        itens_eq[idx].push("5.6.4.6(x2)"); valores_eq[idx].push(formatar(resProj.x2[k]));
        itens_eq[idx].push("5.6.4.6(x3)"); valores_eq[idx].push(formatar(resProj.x3[k]));
        itens_eq[idx].push("5.6.4.6(x)"); valores_eq[idx].push(formatar(resProj.x[k]));
        itens_eq[idx].push("5.6.4.7(d)"); valores_eq[idx].push(formatar(resProj.tx[k]));
      }

      // Teste Hidrostatico
      const resTH = metodoIterativo(espessuras_teste_hidrostatico[i-1], r, Hanel, St[i], Ca_local, "TH", D, G);
      const t2t = resTH.t2a;
      espessuras_teste_hidrostatico.push(t2t);
      for (let k = 0; k < resTH.iterArr.length; k++) {
        itens_eq[idx].push("5.6.4.6(n)"); valores_eq[idx].push(resTH.iterArr[k]);
        itens_eq[idx].push("5.6.4.6(tu)"); valores_eq[idx].push(formatar(resTH.tu[k]));
        itens_eq[idx].push("5.6.4.6(tl)"); valores_eq[idx].push(formatar(resTH.tl[k]));
        itens_eq[idx].push("5.6.4.6(K)"); valores_eq[idx].push(formatar(resTH.K[k]));
        itens_eq[idx].push("5.6.4.6(C)"); valores_eq[idx].push(formatar(resTH.C[k]));
        itens_eq[idx].push("5.6.4.6(x1)"); valores_eq[idx].push(formatar(resTH.x1[k]));
        itens_eq[idx].push("5.6.4.6(x2)"); valores_eq[idx].push(formatar(resTH.x2[k]));
        itens_eq[idx].push("5.6.4.6(x3)"); valores_eq[idx].push(formatar(resTH.x3[k]));
        itens_eq[idx].push("5.6.4.6(x)"); valores_eq[idx].push(formatar(resTH.x[k]));
        itens_eq[idx].push("5.6.4.7(t)"); valores_eq[idx].push(formatar(resTH.tx[k]));
      }

      let t2 = Math.max(t2d, t2t);
      const tmin = espessuraMinimaCasco(D);
      if (t2 < tmin) t2 = tmin;

      espessuras_casco.push(t2);
      espessuras_casco_alertas.push(espessuraExcessivaMaterial(t2, material_casco[i]));
      espessuras_casco_d.push(t2d);
      espessuras_casco_t.push(t2t);

      itens_eq[idx].push("5.6.4(i>=2)"); valores_eq[idx].push(formatar(t2));

      const altura_liquido = H - somarAteIndice(larguraChapaCasco, i);
      memoria.push({
        anel: i + 1,
        altura_liquido: formatar(altura_liquido),
        t_calc: formatar(t2),
        ca: formatar(Ca_local, true),
        material_casco: material_casco[i],
        espessura_excessiva_material: espessuras_casco_alertas[i],
        tensao_projeto: Sd[i],
        tensao_hidrostatico: St[i],
        item_equacao: itens_eq[idx],
        valor_equacao: valores_eq[idx],
      });
    }
  } // fim loop anéis

  // --- Monta retorno (formatando somente para apresentação) ---
  return {
    inputs: {
      metodo,
      unidade: dados.unit,
      tag,
      fluido: dados.fluido,
      altura_nominal: Number(dados.altura).toFixed(2),
      diametro_nominal: Number(dados.diametro).toFixed(2),
      densidade_relativa_fluido: Number(dados.densidade).toFixed(2),
      eficiencia_junta: "NA",
      quantidade_aneis: numRings,
      sobrespessura_corrosao: dados.sobrespessuracasco.map((ca) => formatar(ca, true)),
      material_casco: material_casco,
      largurachapa: dados.largurachapa.map((larg) => formatar(larg)),
    },
    resultados: {
      espessuras_requeridas_aneis: espessuras_casco.map((esp, i) => ({
        anel: i + 1,
        espessura: Number(esp).toFixed(2),
      })),
      espessuras_requeridas_materiais_alerta: espessuras_casco_alertas.map((alert, i) => ({
        anel: i + 1,
        alerta_espessura: alert,
      })),
    },
    alertas: {
      msg_alerta_geral: msg_requisito_diametro_altura,
    },
    memoria,
  };
}
