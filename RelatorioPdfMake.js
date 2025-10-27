// relatorioPdfMake.js
// Módulo para gerar relatório PDF usando pdfmake em Electron

const { Console } = require("console");
const fs = require("fs");
const path = require("path");
const pdfMakePrinter = require("pdfmake");
const agora = new Date();
const dataHora = agora.toLocaleString("pt-BR", {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

function formatar(valor) {
  const num = Number(valor);
  return isNaN(num) ? "-" : num.toFixed(2);
}


// Definição das fontes usadas pelo pdfmake
const fonts = {
  DejaVu: {
    normal: path.join(__dirname, "fonts", "DejaVuSans.ttf"),
    bold: path.join(__dirname, "fonts", "DejaVuSans-Bold.ttf"),
    italics: path.join(__dirname, "fonts", "DejaVuSans-Oblique.ttf"),
  }
};


/**
 * Gera PDF a partir dos dados fornecidos.
 * @param {{ inputs: Object, resultados: Object, memoria: Array, equacaoSVG: string, metodo: string, tag: string }} dados
 * @param {string} outputPath Caminho para salvar o PDF
 * @returns {Promise<void>}
 */
async function gerarRelatorioPdf(dados, outputPath) {
  const memoriaBody = [];
  const inputs = dados.inputs;
  return new Promise((resolve, reject) => {
    try {
      const printer = new pdfMakePrinter(fonts);

      // Monta corpo do documento
      const docDefinition = {
        pageSize: {
          width: 595.28, // A4 em pontos
          height: 841.89 // A4 em pontos
        },
        pageMargins: [40, 60, 40, 60],
        defaultStyle: {
          font: 'DejaVu',
          fontSize: 11,
        },
        content: [],
        styles: {
          header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 10, 0, 10] },
          subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
          tableHeader: { bold: true, fillColor: '#eeeeee', margin: [0, 5, 0, 5] },
        }
      };
            
      
      // Cabeçalho com logo e título
      const logoPath = path.join(__dirname, 'assets', 'images', 'logo.png');
      if (fs.existsSync(logoPath)) {
        docDefinition.content.push({ image: logoPath, width: 120, alignment: 'center', margin: [0, 0, 0, 10] });
      }
      docDefinition.content.push({ text: 'Relatório TankCalc Pro', style: 'header' });
      docDefinition.content.push({ text: `Cálculo da Espessura do Costado — Método ${inputs.metodo}`, style: 'subheader' });

      // Entradas do usuário
      docDefinition.content.push({ text: 'Entradas do Usuário', style: 'subheader' });
      const entradasTable = {
        table: {
          widths: ['auto', '*'],
          body: []
        },
        layout: 'noBorders'
      };
      Object.entries(dados.inputs).forEach(([chave, valor]) => {
        if (!Array.isArray(valor)) { // se não for array, adiciona o valor diretamente
        entradasTable.table.body.push([
          { text: traducaoCampo(chave, inputs) + ':', bold: true },
          valor
        ]);
      }
      else // se for array, abre a lista
      {
        entradasTable.table.body.push([
          { text: traducaoCampo(chave, inputs) + ':', bold: true },
          { ul: valor.map((item, i) =>  `Anel ${i + 1}: ${item}`)}
        ]);
      }
    });
      docDefinition.content.push(entradasTable);

      docDefinition.content.push({ text: 'Memória de Cálculo', style: 'subheader' });

       // Lista de Símbolos
       docDefinition.content.push({ text: 'Lista de Símbolos:', style: 'subheader' });
       docDefinition.content.push({ text: 'D: Diâmetro Nominal', italics: true });
       docDefinition.content.push({ text: 'H: Altura Nominal', italics: true });
       docDefinition.content.push({ text: 'G: Densidade Relativa do Fluido', italics: true });
       docDefinition.content.push({ text: 'E: Eficiência da Junta', italics: true });
       docDefinition.content.push({ text: 'CA: Sobrespessura de Corrosão', italics: true });
       docDefinition.content.push({ text: 'tcalc: Espessura Calculada', italics: true });
       docDefinition.content.push({ text: 'tmin: Espessura Mínima Requerida', italics: true });
       if (inputs.metodo === 'Ponto Fixo' || inputs.metodo === 'Ponto Variável') {
         docDefinition.content.push({ text: 'Sd: Tensão Admissível de Projeto', italics: true });
         docDefinition.content.push({ text: 'St: Tensão Admissível Hidrostática', italics: true });
       }
       if (inputs.metodo === 'Ponto Variável') {
        // docDefinition.content.push({ text: 'x: Distância Vertical Entre Base do Anel e Ponto de Cálculo de Espessura', italics: true })
        docDefinition.content.push({ text: 'td: espessura calculada pelo critério de projeto', italics: true })
        docDefinition.content.push({ text: 'tt: espessura calculada pelo critério de teste hidrostático', italics: true });
        docDefinition.content.push({ text: 't1d: espessura calculada pelo critério de projeto para primeiro anel', italics: true });
        docDefinition.content.push({ text: 't1t: espessura calculada pelo critério de teste hidrostático para primeiro anel', italics: true})
        docDefinition.content.push({ text: 'h1: largura da chapa do primeiro anel', italics: true})
        docDefinition.content.push({ text: 'r: raio do tanque', italics: true})
        
      };
      
      // Adiciona espaço em branco
      docDefinition.content.push({ text: '', margin: [0, 10] });

      // Adiciona equações SVG

      if (Array.isArray(dados.equacoes_png_base64)) {
        dados.equacoes_png_base64.forEach((img, i) => {
          if (img?.startsWith("data:image/png")) {
            docDefinition.content.push({
              image: img,
              width: dados.equacoes_size[i], // redimensiona a imagem para a largura correspondente da imagem
              alignment: 'left',
              margin: [0, 10, 0, 10]
            });
          }
        });
      }
      

// Linha em branco com 15pt de altura (meia linha típica)
docDefinition.content.push({ text: '', margin: [0, 15] });
docDefinition.content.push({ text: 'Resumo Resultados', style: 'subheader' });

  // Resumo Resultados Memória de cálculo (tabela)
  // Montar cabeçalho dinâmico
  const header = [
    { text: 'Anel', style: 'tableHeader' },
    { text: 'Altura Líquido (m)', style: 'tableHeader' },
    { text: 'tcalc (mm)', style: 'tableHeader' },
    { text: 'CA (mm)', style: 'tableHeader' },
    { text: 'Material', style: 'tableHeader' },
    { text: 'Espessura Material Conforme item 4.2.2?', style: 'tableHeader' }
  ];

  if (inputs.metodo === 'Ponto Fixo' || inputs.metodo === 'Ponto Variável') {
    header.push(
      { text: 'Sd (MPa)', style: 'tableHeader' },
      { text: 'St (MPa)', style: 'tableHeader' }
    );
  }

  memoriaBody.push(header);

  // Adiciona as linhas de memória
  dados.memoria.forEach(item => {
    const row = [
      String(item.anel),
      formatar(item.altura_liquido),
      formatar(item.t_calc),
      formatar(item.ca),
      String(item.material_casco),
      {
        text: String(item.espessura_excessiva_material).toUpperCase().includes("NÃO") ? "✔ Sim" : "✘ Não. Espessura Excessiva",
        color: String(item.espessura_excessiva_material).toUpperCase().includes("NÃO") ? "green" : "red",
        bold: true
      }
    ];

    if (inputs.metodo === 'Ponto Fixo' || inputs.metodo === 'Ponto Variável') {
      row.push(
        formatar(item.tensao_projeto),
        formatar(item.tensao_hidrostatico)
      );
      
    };
    memoriaBody.push(row)
    });

    
    docDefinition.content.push({
      table: {
        headerRows: 1,
        widths: (inputs.metodo === 'Ponto Fixo' || inputs.metodo === 'Ponto Variável')
          ? ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
          : ['auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: memoriaBody,
        margin: [0, 10, 0, 20]  // adiciona espaço acima e abaixo da tabela
      }
    });
    

      // Mensagens de Alerta
      docDefinition.content.push({ text: 'Mensagens de Alerta', style: 'subheader' });
      if (dados.alertas.msg_alerta_geral == "Nenhuma") {
        cor_alerta = 'green';
      }
      else {
        cor_alerta = 'red';
      }
      docDefinition.content.push({ text: `${dados.alertas.msg_alerta_geral}`, color: cor_alerta });

      docDefinition.content.push({
        text: `Simulação realizada em: ${dataHora}`,
        alignment: 'right',
        fontSize: 9,
        italics: true,
        margin: [0, 20, 0, 0]
      });

      // Geração do PDF
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const writeStream = fs.createWriteStream(outputPath);
      pdfDoc.pipe(writeStream);
      pdfDoc.end();
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Traduz chaves de campos para labels legíveis
 */
function traducaoCampo(campo, inputs) {
  let unidade_dia_alt, unidade_esp, unidade_larg;
  inputs.unidade == 'in/ft' ? unidade_dia_alt = 'ft' : unidade_dia_alt = 'm';
  inputs.unidade == 'in/ft' ? unidade_esp = 'in' : unidade_esp = 'mm';
  inputs.unidade == 'in/ft' ? unidade_larg = 'in' : unidade_larg = 'm';
  const mapa = {
    metodo: 'Método',
    tag: 'TAG',
    fluido: 'Fluido',
    diametro_nominal: `Diâmetro Nominal (${unidade_dia_alt})`,
    altura_nominal: `Altura Nominal (${unidade_dia_alt})`,
    densidade_relativa_fluido: 'Densidade Relativa',
    eficiencia_junta: 'Eficiência Junta',
    quantidade_aneis: 'Quantidade de Anéis',
    material_casco: 'Material do Casco',
    sobrespessura_corrosao: `Sobrespessura de Corrosão (${unidade_esp})`,
    largurachapa: `Largura da Chapa (${unidade_larg})`,
  };
  return mapa[campo] || campo;
}

module.exports = { gerarRelatorioPdf };