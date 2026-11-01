// Cálculos de salud basados en los datos corporales del usuario (peso,
// estatura, edad, nivel de actividad). Son estimaciones generales, no
// consejo médico — sirven como referencia, no como recomendación clínica.

const FACTOR_AGUA_POR_NIVEL = {
  Sedentario: 30, // ml por kg de peso
  Moderado: 35,
  Activo: 40,
  "Muy activo": 45,
};

// Agua recomendada al día, en mililitros, según el peso y nivel de
// actividad (fórmula general de ml/kg, ajustada por actividad).
export function calcularAguaRecomendada(peso, nivelActividad) {
  if (!peso || peso <= 0) return null;
  const factor = FACTOR_AGUA_POR_NIVEL[nivelActividad] || FACTOR_AGUA_POR_NIVEL.Moderado;
  return Math.round(peso * factor);
}

// Índice de Masa Corporal — peso (kg) / estatura (m) al cuadrado.
export function calcularIMC(peso, estaturaCm) {
  if (!peso || peso <= 0 || !estaturaCm || estaturaCm <= 0) return null;
  const estaturaM = estaturaCm / 100;
  return Math.round((peso / (estaturaM * estaturaM)) * 10) / 10;
}

export function clasificarIMC(imc) {
  if (imc == null) return null;
  if (imc < 18.5) return { label: "Bajo peso", color: "var(--amber)" };
  if (imc < 25) return { label: "Normal", color: "var(--sage)" };
  if (imc < 30) return { label: "Sobrepeso", color: "var(--amber)" };
  return { label: "Obesidad", color: "var(--stamp)" };
}
