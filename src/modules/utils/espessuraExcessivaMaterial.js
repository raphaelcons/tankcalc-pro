export default function espessuraExcessivaMaterial(
  esp,
  material_casco_iesimo_anel
) {
  // Aplicação do item 4.2.2 da API 650 (espessuras máximas de material para evitar fratura frágil)
  const msg_espessura_excessiva_material = "Sim. Espessura excessiva!";

  if (
    ["A36", "A516 Grade 55", "A516 Grade 60", "A516 Grade 65", "A516 Grade 70", "A573 Grade 70"].includes(material_casco_iesimo_anel) &&
    esp > 40
  ) {
    return msg_espessura_excessiva_material;
  } else if (
    ["A131 Grade B", "A283 Grade C"].includes(material_casco_iesimo_anel) &&
    esp > 25
  ) {
    return msg_espessura_excessiva_material;
  } else if (material_casco_iesimo_anel === "A131 Grade A" && esp > 13) {
    return msg_espessura_excessiva_material;
  } else {
    return "Não";
  }
}
