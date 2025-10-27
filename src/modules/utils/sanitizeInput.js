export default function sanitizeInput(H, D, G, Ca_casco, larguraChapaCasco) {
    // Verifica se os valores são números válidos
    let sanitizedInputList = [];
    const isValidNumberH = !isNaN(parseFloat(H) && H > 0);
    const isValidNumberD = !isNaN(parseFloat(D)) && D > 0;
    const isValidNumberG = !isNaN(parseFloat(G)) && G > 0;
    const isValidNumberCa_casco = Ca_casco.every((item) => !isNaN(parseFloat(item)));

    let sumLargura = 0;
    for (let i = 0; i < larguraChapaCasco.length; i++) {
      sumLargura += larguraChapaCasco[i];
    }

    const isValidNumberLarguraChapaCasco = larguraChapaCasco.every((item) => !isNaN(parseFloat(item)) && item > 0);
    const isValidNumberLarguraChapaCascoSum = sumLargura <= H;
    sanitizedInputList.push(isValidNumberH, isValidNumberD, isValidNumberG, isValidNumberCa_casco, isValidNumberLarguraChapaCasco, isValidNumberLarguraChapaCascoSum);
    const isValidNumber = sanitizedInputList.every((item) => item === true);
    let msgAlertH = "";
    let msgAlertD = "";
    let msgAlertG = "";
    let msgAlertCa_casco = "";
    let msgAlertLarguraChapaCasco = "";
    let msgAlertLarguraChapaCascoSum = "";
    if (!isValidNumberH) msgAlertH = "Altura deve ser maior que 0 e um número válido.\n";
    if (!isValidNumberD) msgAlertD = "Diâmetro deve ser maior que 0 e um número válido.\n";
    if (!isValidNumberG) msgAlertG = "Densidade deve ser maior que 0 e um número válido.\n";
    if (!isValidNumberCa_casco) msgAlertCa_casco = "Sobrespessura de corrosão deve ser um número válido.\n";
    if (!isValidNumberLarguraChapaCasco) msgAlertLarguraChapaCasco = "Largura da chapa do casco deve ser maior que 0 e um número válido.\n";
    if (!isValidNumberLarguraChapaCascoSum) msgAlertLarguraChapaCascoSum = "A soma das larguras da chapa do casco deve ser menor ou igual que a altura do tanque.\n";  
    
    // Retorna a mensagem de erro se o valor não for válido; caso contrário, uma mensagem de validação
    if (!isValidNumber) {
      return `Valores inválidos. Verifique os dados informados.\n${msgAlertH}${msgAlertD}${msgAlertG}${msgAlertCa_casco}${msgAlertLarguraChapaCasco}${msgAlertLarguraChapaCascoSum}`;
    }
    else{
        return true;
    }
}