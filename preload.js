const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  gerarPDF: (dados) => ipcRenderer.send("gerar-pdf", dados),
  onPDFGerado: (callback) => ipcRenderer.on("pdf-gerado", callback),
  getExcelBuffer: () => ipcRenderer.invoke("get-excel-buffer"),
  badInputAlert: (message) => ipcRenderer.send("bad-input-alert", message),
});
