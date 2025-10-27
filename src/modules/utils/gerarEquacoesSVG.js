// gerarEquacoesSVG.js
// Renderiza equações LaTeX usando MathJax no back-end (Node.js)

import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { SwitchCamera } from 'lucide-react';

/**
 * Função para converter texto com acentos e símbolos especiais para formato LaTeX seguro
 * @param {string} text Texto a ser convertido
 * @returns {string} Texto convertido para LaTeX seguro
*/ 
function latexSafeText(text) {
  if (!text) return '';

  const mapaAcentos = {
    'á': "\\'a", 'à': "\\a", 'ã': "\\~a", 'â': "\\^a",
    'é': "\\'e", 'ê': "\\^e",
    'í': "\\'i", 'î': "\\^i",
    'ó': "\\'o", 'ô': "\\^o", 'õ': "\\~o",
    'ú': "\\'u", 'ü': '\\"u',
     'ç': "c",
    'Á': "\\'A", 'À': "\\A", 'Â': "\\^A", 'Ã': "\\~A",
    'É': "\\'E", 'Ê': "\\^E",
    'Í': "\\'I",
    'Ó': "\\'O", 'Ô': "\\^O", 'Õ': "\\~O",
    'Ú': "\\'U", 'Ü': '\\"U',
    'Ç': "C"
  };

  const mapaSimbolos = {
    '&': '\\&',
    '%': '\\%',
    '$': '\\$',
    '#': '\\#',
    '_': '\\_',
    '{': '\\{',
    '}': '\\}',
    '~': '\\textasciitilde{}',
    '^': '\\textasciicircum{}',
    '\\': '\\textbackslash{}'
  };

  return text
    .split('')
    .map(char => mapaAcentos[char] || mapaSimbolos[char] || char)
    .join('');
}

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const svg = new SVG({ fontCache: 'none' });
const html = mathjax.document('', { InputJax: tex, OutputJax: svg });

/**
 * Retorna o SVG renderizado da equação LaTeX com base no método informado
 * @param {string} metodo 'Anexo A' | 'Ponto Fixo' | 'Ponto Variável' | 'Subtítulo'
 * @param {string} item item da equação do API 650 a ser renderizada
 * @param {float | string} output Valor de saída da equação, usado para renderizar o SVG corretamente
 * @returns {string} SVG em formato string (XML)
 */
export default async function equacaoSVG(metodo, item, output, comentario_opcional='') {
  let latex = '';

  switch (metodo) {
    case 'Anexo A': // item A.4.1 da API 650
      switch (item) {
        case 'A.4.1': // item A.4.1 da API 650
          latex = String.raw`\begin{array}{l}
                         \text{${latexSafeText(comentario_opcional)}} \\
                         \textbf{Item\, ${item}} \\
                         t_{calc} = \frac{4.9 \cdot D \cdot (H - 0.3) \cdot G}{E \cdot 145} + CA = ${output} \text{ mm} \\
                         \end{array}`;
          break;
        case '5.6.1':
          latex = String.raw`\begin{array}{l}
          \text{${latexSafeText(comentario_opcional)}} \\
          \text{${latexSafeText('Espessura mínima requerida para o casco conforme Tabela do item 5.6.1.2')}} \\
          \textbf{Item\, ${item}} \\
          \begin{cases}
          \text{5 mm}, & \text{se } D < \text{15 m} \\
          \text{6 mm}, & \text{se } 15 m \leq D < \text{36 m} \\
          \text{8 mm}, & \text{se } 36 m \leq D \leq \text{60 m} \\
          \text{10 mm}, & \text{se } D > \text{60 m}
          \end{cases} \\
          t_{min} = ${output} \text{ mm} \\
          \end{array}`;
          break;
        case 'A.1.1':
          latex = String.raw`\begin{array}{l}
    \text{${latexSafeText(comentario_opcional)}} \\
    \textbf{Item\, ${item}} \\
    \text{${latexSafeText('Espessura de um ou mais anéis do tanque maior que 13 mm.')}} \\
    \text{${latexSafeText('Considere utilizar outro método ou outro material.')}} \\
    \text{${latexSafeText('Abandonando cálculo.')}} \\
    \end{array}`;
          break;
        case "NOTA 4 - item 5.6.1.2":
          latex = String.raw`\begin{array}{l}
    \text{${latexSafeText(comentario_opcional)}} \\
    \textbf{Item\, ${item}} \\
    \text{${latexSafeText('Se D < 15 m, a espessura mínima do primeiro anel é 6 mm.')}} \\
    \end{array}`;
          break;
        case 'Anel N':
          latex = String.raw`
    \begin{gather}
      \LARGE\textbf{${output}}
    \end{gather}`;   
          break;
      }
      break;
    case 'Ponto Fixo': // item 5.6.3 da API 650
      switch (item) {
        case '5.6.1':
          latex = String.raw`\begin{array}{l}
                          \text{${latexSafeText(comentario_opcional)}} \\
                          \text{${latexSafeText('Espessura mínima requerida para o casco conforme Tabela do item 5.6.1.2')}} \\
                          \textbf{Item\, ${item}} \\
                          \begin{cases}
                          \text{5 mm}, & \text{se } D < \text{15 m} \\
                          \text{6 mm}, & \text{se } 15 m \leq D < \text{36 m} \\
                          \text{8 mm}, & \text{se } 36 m \leq D \leq \text{60 m} \\
                          \text{10 mm}, & \text{se } D > \text{60 m}
                          \end{cases} \\
                          t_{min} = ${output} \text{ mm} \\
                          \end{array}`;
          break;
        case '5.6.3(d)':
          latex = String.raw`\begin{array}{l}
                         \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
                         Item\, \textbf{${item.replace("(d)", "")}.} \\
                         t_d = \frac{4.9 \cdot D \cdot (H - 0.3) \cdot G}{S_d} + CA \\
                         t_d = ${output} \text{ mm} \\
                         \end{array}`;
          break;
        case '5.6.3(t)':
          latex = String.raw`\begin{array}{l}
                            \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
                            Item\, \textbf{${item.replace("(t)", "")}.} \\
                            t_t = \frac{4.9 \cdot D \cdot (H - 0.3) \cdot G}{S_t} \\
                            t_t = ${output} \text{ mm} \\
                            \end{array}`;
          break;
        case '5.6.3':
          latex = String.raw`\begin{array}{l}
                            \text{${latexSafeText(comentario_opcional)}} \\
                            \textbf{Item\, ${item}} \\
                            t_{calc} = \max(t_d, t_t), se \quad \max(t_d, t_t) > t_{min} \\
                            t_{calc} = t_{min}, se \quad \max(t_d, t_t) <= t_{min}  \\
                            t_{calc} = ${output} \text{ mm} \\
                            \end{array}`;
          break;
        case '5.6.3.1':
          latex = String.raw`\begin{array}{l}
    \text{${latexSafeText(comentario_opcional)}} \\
    \textbf{Item\, ${item}} \\
    \text{${latexSafeText('Diâmetro do tanque maior que 61 m.')}} \\
    \text{${latexSafeText('O método do Ponto Fixo não pode ser Utilizado.')}} \\
    \text{${latexSafeText('Abandonando cálculo.')}} \\
    \end{array}`;
          break;
        case "NOTA 4 - item 5.6.1.2":
          latex = String.raw`\begin{array}{l}
    \text{${latexSafeText(comentario_opcional)}} \\
    \textbf{Item\, ${item}} \\
    \text{${latexSafeText('Se D < 15 m, a espessura mínima do primeiro anel é 6 mm.')}} \\
    \end{array}`;
          break;
        case 'Anel N':
          latex = String.raw`
        \begin{gather}
          \textbf{${output}}
        \end{gather}`;      
          break;
      }
      break;
    case 'Ponto Variável': // item 5.6.4 da API 650
      switch (item) {
        case '5.6.1':
          latex = String.raw`\begin{array}{l}
                          \text{${latexSafeText(comentario_opcional)}} \\
                          \text{${latexSafeText('Espessura mínima requerida para o casco conforme Tabela do item 5.6.1.2')}} \\
                          \textbf{Item\, ${item}} \\
                          \begin{cases}
                          \text{5 mm}, & \text{se } D < \text{15 m} \\
                          \text{6 mm}, & \text{se } 15 m \leq D < \text{36 m} \\
                          \text{8 mm}, & \text{se } 36 m \leq D \leq \text{60 m} \\
                          \text{10 mm}, & \text{se } D > \text{60 m}
                          \end{cases} \\
                          t_{min} = ${output} \text{ mm} \\
                          \end{array}`;
          break;
        case '5.6.3.2(d)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
        Item\, \textbf{${item.replace("(d)", "")}.} \\
        t_d = \frac{4.9 \cdot D \cdot (H - 0.3) \cdot G}{S_d} + CA \\
        t_d = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case "5.6.3.2(t)":
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
        Item\, \textbf{${item.replace("(t)", "")}.} \\
        t_t = \frac{4.9 \cdot D \cdot (H - 0.3) \cdot G}{S_t} \\
        t_t = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case "5.6.4.4(d)":
          latex = String.raw`\begin{array}{l}
      \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
      Item\, \textbf{${item.replace("(d)", "")}.} \\
      t_{1d} = 1.06 - \frac{(0.0696 \cdot D)}{H} \cdot \sqrt{\frac{H}{S_d}} \cdot (\frac{4.9 \cdot H \cdot D \cdot G}{S_d}) + CA \\
      t_{1d} = ${output} \text{ mm} \\
      \end{array}`;
          break;
        case "5.6.4.4(t)":
          latex = String.raw`\begin{array}{l}
      \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
      Item\, \textbf{${item.replace("(t)", "")}.} \\
      t_{1t} = 1.06 - \frac{(0.0696 \cdot D)}{H} \cdot \sqrt{\frac{H}{S_t}} \cdot (\frac{4.9 \cdot H \cdot D \cdot G}{S_t}) \\
      t_{1t} = ${output} \text{ mm} \\
      \end{array}`;
          break;
        case '5.6.4.1':
          latex = String.raw`\begin{array}{l}
      \text{${latexSafeText(comentario_opcional)}} \\
      \textbf{Item\, ${item}} \\
      L = (500 \cdot D \cdot t_1) ^ {0.5} \\
      \frac{L}{H} = ${output} \\
      \end{array}`;
          break;
        case '5.6.4.1(fail)':
          latex = String.raw`\begin{array}{l}
      Item\, \textbf{${item.replace("(fail)", "")}} \\
      \text{${latexSafeText('Relação L/H maior que 1000/6, o método do Ponto Variável não pode ser utilizado.')}} \\
      \text{${latexSafeText('Abandonando cálculo.')}} \\
      \end{array}`;
          break;
        case '5.6.4':
          latex = String.raw`\begin{array}{l}
      \text{${latexSafeText(comentario_opcional)}} \\
      \textbf{Item\, ${item}} \\
      t_{calc} = \max(\min(t_d, t_{1d}), \min(t_t, t_{1t})), se \quad \max(\min(t_d, t_{1d}), \min(t_t, t_{1t})) > t_{min} \\
      t_{calc} = t_{min}, se \quad \max(\min(t_d, t_{1d}), \min(t_t, t_{1t})) <= t_{min} \\
      t_{calc} = ${output} \text{ mm} \\
      \end{array}`;
          break;
        case '5.6.4(i>=2)':
          latex = String.raw`\begin{array}{l}
      \text{${latexSafeText(comentario_opcional)}} \\
      Item\, \textbf{${item.replace("(i>=2)", "")}} \\
      t_{calc} = \max(t_{2d}, t_{2t}), se \quad \max(t_{2d}, t_{2t}) > t_{min} \\
      t_{calc} = t_{min}, se \quad \max(t_{2d}, t_{2t}) <= t_{min} \\
      t_{calc} = ${output} \text{ mm} \\
      \end{array}`;
          break;
        case '5.6.4.1(ratio)(d)':
          latex = String.raw`\begin{array}{l}
      \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
      Item\, \textbf{${item.replace("(ratio)(d)", "")}} \\
      \text{${latexSafeText('Razão geométrica para primeiro anel, considerando espessura para projeto')}}
      (\frac{h_1}{(rt_1)^{0.5}})_{projeto} = ${output} \\
      \end{array}`;
          break;
        case '5.6.4.1(ratio)(t)':
          latex = String.raw`\begin{array}{l}
      \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
      Item\, \textbf{${item.replace("(ratio)(t)", "")}} \\
      \text{${latexSafeText('Razão geométrica para primeiro anel, considerando espessura para teste hidrostático')}} \\
      (\frac{h_1}{(rt_1)^{0.5}})_{teste} = ${output} \\
      \end{array}`;
          break;
        case '5.6.4.5(ratio)(d)(1)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
        Item\, \textbf{${item.replace("(ratio)(d)(1)", "")}} \\
        (\frac{h_1}{(rt_1)^{0.5}})_{projeto} <= 1.375 \\
        t_{2d} = t1 = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.5(ratio)(d)(2)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
        Item\, \textbf{${item.replace("(ratio)(d)(2)", "")}} \\
        1.375 < (\frac{h_1}{(rt_1)^{0.5}})_{projeto} <= 2.625 \\
        t_{2d} = t_{2a} + (t_1 - t_{2a})\cdot[2.1 - \frac{h1}{1.25(rt_1)^{0.5}}] = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.5(ratio)(d)(3)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
        Item\, \textbf{${item.replace("(ratio)(d)(3)", "")}} \\
        (\frac{h_1}{(rt_1)^{0.5}})_{projeto} > 2.625 \\
        t_{2d} = t_{2a} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.5(ratio)(t)(1)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
        Item\, \textbf{${item.replace("(ratio)(t)(1)", "")}} \\
        (\frac{h_1}{(rt_1)^{0.5}})_{teste} <= 1.375 \\
        t_{2t} = t1 = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.5(ratio)(t)(2)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
        Item\, \textbf{${item.replace("(ratio)(t)(2)", "")}} \\
        1.375 < (\frac{h_1}{(rt_1)^{0.5}})_{teste} <= 2.625 \\
        t_{2t} = t_{2a} + (t_1 - t_{2a})\cdot[2.1 - \frac{h1}{1.25(rt_1)^{0.5}}] = ${output} \\
        \end{array}`;
          break;
        case '5.6.4.5(ratio)(t)(3)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
        Item\, \textbf{${item.replace("(ratio)(t)(3)", "")}} \\
        (\frac{h_1}{(rt_1)^{0.5}})_{teste} > 2.625 \\
        t_{2t} = t_{2a} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.7(d)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Projeto")}}} \\
        Item\, \textbf{${item.replace("(d)", "")}} \\
        t_{dx} = \frac{4.9 \cdot D \cdot (H - \frac{x}{1000}) \cdot G}{S_d} + CA \\
        t_{dx} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.7(t)':
          latex = String.raw`\begin{array}{l}
        \text{\emph{${latexSafeText("Critério de Teste Hidrostático")}}} \\
        Item\, \textbf{${item.replace("(d)", "")}} \\
        t_{tx} = \frac{4.9 \cdot D \cdot (H - \frac{x}{1000})}{S_t} \\
        t_{tx} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(tu)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(tu)", "")}} \\
        t_{u} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(tl)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(tl)", "")}} \\
        t_{l} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(K)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(K)", "")}} \\
        K = \frac{t_l}{t_u} = ${output} \\
        \end{array}`;
          break;
        case '5.6.4.6(C)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(C)", "")}} \\
        C = \frac{K^{0.5}(K-1)}{(1+K^{1.5})} = ${output} \\
        \end{array}`;
          break;
        case '5.6.4.6(x1)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(x1)", "")}} \\
        x_1 = 0.61 \cdot (rt_u)^{0.5} + 320 \cdot CH = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(x2)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(x2)", "")}} \\
        x_2 = 1000 \cdot CH = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(x3)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(x3)", "")}} \\
        x_3 = 1.22 \cdot (rt_u)^{0.5} = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(x)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(x)", "")}} \\
        x = \min(x1, x2, x3) = ${output} \text{ mm} \\
        \end{array}`;
          break;
        case '5.6.4.6(n)':
          latex = String.raw`\begin{array}{l}
        \text{${latexSafeText(comentario_opcional)}} \\
        Item\, \textbf{${item.replace("(n)", "")}} \\
        \text{${latexSafeText('Iteração número')} = ${output + 1}} \\
        \end{array}`;
          break;
        case 'Anel N':
          latex = String.raw`
          \begin{gather}
            \LARGE\textbf{${output}}
          \end{gather}`;      
          break;
        default:
          return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="50"><text x="20" y="30" font-family="Arial">Método não reconhecido</text></svg>';
      }
      break;
    default:
      return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="50"><text x="20" y="30" font-family="Arial">Método não reconhecido</text></svg>';
  }
  
  const node = html.convert(latex, {
    display: true,
    em: 12, // tamanho da fonte base em px
    ex: 8, // altura da linha base em px
    containerWidth: 2000,
  });
 
  let svg_html = adaptor.innerHTML(node);

  // Extrai largura e altura reais do SVG em `ex`
  const matchWidth = svg_html.match(/<svg[^>]*?width="([\d.]+)ex"/);  
  const larguraSvgEx = matchWidth ? parseFloat(matchWidth[1]) : NaN;
  
  // Converte de ex para pixels
  // Regra: 1em = 16px, 1ex ≈ 8px (varia, mas assume como base)
  const exToPx = 8;
  const larguraSvgPx = larguraSvgEx * exToPx;
  let larguraSvgPt = larguraSvgPx * 0.75 // 1px = 0.75pt (ponto tipográfico) // 0.25 é um fator de escala para ajustar aequalão na página
  if (larguraSvgPt > (595.28 - 80)) larguraSvgPt = 595.28 - 80; // limita a largura do SVG para não ultrapassar a largura útil da página A4 (595.28pt) menos margens de 40pt

  return {
    svgStringHTML: svg_html,
    larguraSvgPt: larguraSvgPt
  };
}