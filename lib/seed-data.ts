import type { Movement } from "@/lib/types"
import excelHistory from "@/lib/excel-history.json"

const fixedExpenses = [
  ["Youtube Premium", [5000, 5000, 5000, 5000, 5000, 5000, 5000]],
  ["Peluquería", [18000, 0, 20000, 20000, 0, 20000, 0]],
  ["iCloud", [4470, 4470, 4320, 4290, 5970, 5970, 2045]],
  ["Cuotas compras", [241303, 318300, 318300, 395034, 267639, 432854, 222651]],
  ["Monotributo", [37085.74, 42386.74, 42387, 42387, 42387, 42387, 0]],
  ["Inversiones", [465000, 460900, 450000, 420000, 423000, 450000, 450000]],
  ["Cursor / Chat", [38667, 37382, 37300, 37427, 37460, 0, 0]],
] as const

const variableExpenses = [
  ["Salidas", [134823, 71088, 83600, 81735, 165500, 30500, 3500]],
  ["Comidas salidas", [50400, 258393, 141820, 312444, 252038, 199915, 125250]],
  ["Tiro Federal", [0, 37500, 119400, 0, 117500, 146250, 0]],
  ["Steam o Juegos", [0, 7224, 188906, 15974, 7191, 39813, 16657]],
  ["Compras Compu", [0, 0, 0, 0, 0, 48319, 0]],
  ["Auto", [10000, 20000, 92380, 11300, 10000, 77500, 32000]],
  ["Vapes", [0, 0, 0, 0, 0, 0, 0]],
  ["Otros", [1180000, 420205, 73068, 37400, 215500, 400056, 183299]],
] as const

const incomes = [
  ["Sueldo", [1850000, 1887000, 1930000, 1950000, 1950000, 1950000, 2000000]],
  ["Vapeclub", [0, 0, 0, 0, 0, 0, 0]],
  ["Ventas Facebook", [0, 525000, 0, 206800, 0, 0, 0]],
  ["Otros", [0, 0, 0, 0, 0, 0, 0]],
] as const

function buildRows(rows: readonly (readonly [string, readonly number[]])[], type: Movement["type"], group: Movement["group"]) {
  return rows.flatMap(([category, amounts]) =>
    amounts.flatMap((amount, month) => amount > 0 ? [{
      id: `excel-2026-${type}-${category}-${month}`,
      type,
      group,
      category,
      amount,
      date: `2026-${String(month + 1).padStart(2, "0")}-01`,
      note: "Importado del Excel",
      createdAt: "2026-07-14T00:00:00.000Z",
    }] : [])
  )
}

const historicalMovements = excelHistory as Movement[]

export const initialMovements: Movement[] = [
  ...historicalMovements,
  ...buildRows(incomes, "income", "Ingresos"),
  ...buildRows(fixedExpenses, "expense", "Gastos fijos"),
  ...buildRows(variableExpenses, "expense", "Gastos del día a día"),
]

export const defaultCategories = {
  income: ["Sueldo", "Vapeclub", "Ventas Facebook", "Otros"],
  fixed: fixedExpenses.map(([category]) => category),
  variable: variableExpenses.map(([category]) => category),
}
