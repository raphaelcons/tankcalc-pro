// main.js
const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const fs = require("fs");
const path = require("path");
const { shell } = require("electron");
const { gerarRelatorioPdf } = require("./RelatorioPdfMake");
const sharp = require("sharp"); // usado para converter svg -> png
const { Console } = require("console");
const equacaoSVG = require("./src/modules/utils/gerarEquacoesSVG").default; // funcão que gera LaTeX -> SVG
const { randomUUID } = require('crypto'); // geração de números aleatórios
const agora = new Date();
const dataAgora = agora.toLocaleDateString("pt-BR", {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
}).replaceAll("/", "-") // data atual formatada para o nome do arquivo PDF


ipcMain.handle("get-excel-buffer", async () => {
  const filePath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "tabelas", "Tabela_5.2a.xlsx")
    : path.join(__dirname, "assets", "tabelas", "Tabela_5.2a.xlsx");

  return fs.readFileSync(filePath).buffer;
});


ipcMain.on("bad-input-alert", (event, message) => {
  dialog.showMessageBox({
    type: "error",
    title: "Erro de Entrada",
    message: message,
    buttons: ["OK"],
  });
});

app.whenReady().then(() => {
  //Criando uma nova janela
  const minhaJanela = new BrowserWindow({
    icon: path.join(
      app.isPackaged
        ? path.join(process.resourcesPath, "assets", "images", "logo.png")
        : path.join(__dirname, "assets", "images", "logo.png")
    ), // ícone do app
    width: 1920,
    height: 1080,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: true,
    },
  });

  const template = [
    {
      label: "Arquivo",
      submenu: [
        {
          label: "Fechar",
          role: "quit",
        },
      ],
    },
    {
      label: "Editar",
      submenu: [
        {
          label: "Desfazer",
          role: "undo",
        },
        {
          label: "Refazer",
          role: "redo",
        },
        {
          label: "Cortar",
          role: "cut",
        },
        {
          label: "Copiar",
          role: "copy",
        },
        {
          label: "Colar",
          role: "paste",
        },
        {
          label: "Selecionar Tudo",
          role: "selectAll",
        },
      ],
    },
    {
      label: "Exibir",
      submenu: [
        {
          label: "Recarregar",
          role: "reload",
        },
        {
          label: "Forçar Recarregar",
          role: "forceReload",
        },
        {
          label: "Resetar Zoom",
          role: "resetZoom",
        },
        {
          label: "Zoom In",
          role: "zoomIn",
        },
        {
          label: "Zoom Out",
          role: "zoomOut",
        },
        {
          label: "Alternar FullScreen",
          role: "togglefullscreen",
        },
      ],
    },
    {
      label: "Janela",
      submenu: [
        {
          label: "Minimizar",
          role: "minimize",
        },
        {
          label: "Fechar",
          role: "close",
        },
      ],
    },
    {
      label: "Ajuda",
      submenu: [
        {
          label: "Documentação",
          click: async () => {
            const { shell } = require("electron");
            await shell.openExternal(
              "https://github.com/raphaelcons/TankCalc-Pro-docs/blob/803612988f7952f9d80d59a0068eb2dba3d86b1c/Modulo-Espessuras-TUTORIAL.md"
            );
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template); // carrega o menu criado na janela principal
  Menu.setApplicationMenu(menu);

  const isDev = !app.isPackaged;

  // Carregando as páginas html
  if (isDev) {
    minhaJanela.loadURL("http://localhost:5173"); // Usa Vite Dev Server
    // Carregando o Console
    minhaJanela.webContents.openDevTools(); // Console de Debug
  } else {
    minhaJanela.loadFile(path.join(__dirname, "dist", "index.html")); // Versão empacotada
  }

  // Geração do PDF ao receber os dados
  ipcMain.on("gerar-pdf", async (event, dados) => {
    let inputs = dados.inputs;
    const pasta = await dialog.showSaveDialog(minhaJanela, {
      title: "Salvar Relatório PDF",
      defaultPath: path.join(
        app.getPath("documents"),
        `TankCalc_${inputs.tag || "SemTAG"}_${dataAgora}.pdf`
      ),
            filters: [
        { name: "Arquivos PDF", extensions: ["pdf"] },
        { name: "Todos os Arquivos", extensions: ["*"] },
      ],
      properties: ["createDirectory"],
    });

    if (pasta.canceled) {
      event.reply("pdf-gerado", {
        sucesso: false,
        erro: "Cancelado pelo usuário",
      });
      return;
    }

    const pdfPath =
      typeof pasta.filePath == "string"
        ? pasta.filePath
        : String(pasta.filePath); // converte o caminho do pdf em string para que a variável pdfPath não receba um objeto em vez de uma string


    let tempDir = path.join(app.getPath("temp"), "tankcalc-cache");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    
    
    // === Renderização da equação LaTeX com MathJax (back-end) ===
    dados.equacoes_png_base64 = []; // array de imagens base64
    dados.equacoes_size = []; // array de tamanhos das imagens (largura)

    try {
      for (let i = 0; i < dados.memoria.length; i++) { // (i+1) é o número do anel
        const metodo = dados.inputs.metodo; // 'Anexo A' | 'Ponto Fixo' | 'Ponto Variável' | Subtítulo
        const item_eq = dados.memoria[i].item_equacao; // exemplo: 'A.4.1' ou '5.6.1'
        const valor_eq = dados.memoria[i].valor_equacao; // valor da equação calculada
        const comentario_opcional = '';

        if (!Array.isArray(item_eq)) {
        const {svgStringHTML, larguraSvgPt} = await equacaoSVG(
          metodo,
          item_eq, // exemplo: 'A.4.1' ou '5.6.1'
          valor_eq, // valor da equação calculada
          comentario_opcional
        );
        const id = randomUUID(); // garante unicidade de número aleatório
        const svgPath = path.join(tempDir, `equacao_${id}.svg`);
        const pngPath = path.join(tempDir, `equacao_${id}.png`);
        fs.writeFileSync(svgPath, svgStringHTML);
  
        await sharp(svgPath).resize({ width: 1200}).png().toFile(pngPath);
  
        const buffer = fs.readFileSync(pngPath);
        const base64 = `data:image/png;base64,${buffer.toString("base64")}`;
        dados.equacoes_png_base64.push(base64);
        dados.equacoes_size.push(larguraSvgPt); // adiciona o tamanho da imagem ao array de tamanhos
      } else {
          for (let j = 0; j < item_eq.length; j++) {
            const {svgStringHTML, larguraSvgPt} = await equacaoSVG(
              metodo,
              item_eq[j], // exemplo: 'A.4.1' ou '5.6.1'
              valor_eq[j], // valor da equação calculada
              comentario_opcional
            );
            if (svgStringHTML === undefined) console.log(`Erro ao gerar equação SVG no anel ${i+1}:`, item_eq[j], valor_eq[j]);
            const id = randomUUID(); // garante unicidade de número aleatório
            const svgPath = path.join(tempDir, `equacao_${id}.svg`);
            const pngPath = path.join(tempDir, `equacao_${id}.png`);
            fs.writeFileSync(svgPath, svgStringHTML);
      
            await sharp(svgPath).resize({ width: 1200}).png().toFile(pngPath);
      
            const buffer = fs.readFileSync(pngPath);
            const base64 = `data:image/png;base64,${buffer.toString("base64")}`;
            dados.equacoes_png_base64.push(base64);
            dados.equacoes_size.push(larguraSvgPt); // adiciona o tamanho da imagem ao array de tamanhos
          }
        }
      }
    } catch (erro) {
      console.error("Erro ao gerar equações SVG:", erro);
      dados.equacoes_png_base64 = [];
    }
  
    // === Geração final do PDF ===
    try {
      await gerarRelatorioPdf(dados, pdfPath);
      shell.openPath(pdfPath);
      event.reply("pdf-gerado", { sucesso: true, caminho: pdfPath });
    } catch (err) {
      console.error("Erro ao gerar PDF via pdfmake:", err);
      event.reply("pdf-gerado", { sucesso: false, erro: err.message });
    }
})});
