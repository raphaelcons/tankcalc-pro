export default function formatar(valor, iszerodefault=false) {
    if (iszerodefault) { // se a variável formatada for corrosion allowance (zero por padrão)
      if (valor == "" || valor == null || valor == undefined) {
        valor = "0"; // se o valor for vazio, assume zero por padrão
      }
    const num = Number(valor);
    return isNaN(num) ? "-" : num.toFixed(2);
    } else {
    const num = Number(valor);
    return isNaN(num) ? "-" : num.toFixed(2);
    }
}