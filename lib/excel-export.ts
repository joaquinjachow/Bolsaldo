import XLSX from "xlsx-js-style"
import type { Movement } from "@/lib/types"

const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const border = { style: "thin", color: { rgb: "D1D5DB" } }
const tableBorder = { top: border, bottom: border, left: border, right: border }

function cellStyle(sheet: XLSX.WorkSheet, address: string, style: Record<string, unknown>) {
  const cell = sheet[address] as { s?: Record<string, unknown> } | undefined
  if (cell) cell.s = { ...(cell.s ?? {}), ...style }
}

function styleTableSheet(sheet: XLSX.WorkSheet, currencyColumns: number[]) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1")
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column })
      cellStyle(sheet, address, { border: tableBorder, alignment: { vertical: "center", horizontal: column === 0 ? "left" : "right" } })
      if (currencyColumns.includes(column)) cellStyle(sheet, address, { numFmt: '"$"#,##0' })
    }
  }
  sheet["!rows"] = [{ hpt: 24 }]
}

function styleDetailSheet(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:A1")
  styleTableSheet(sheet, [5])
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    cellStyle(sheet, XLSX.utils.encode_cell({ r: 0, c: column }), { fill: { fgColor: { rgb: "0F766E" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } })
  }
  sheet["!cols"] = [{ wch: 13 }, { wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 34 }, { wch: 16 }, { wch: 14 }, { wch: 10 }]
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range(range) }
}

function buildYearSheet(movements: Movement[], year: number) {
  const rows: (string | number)[][] = [["Bolsaldo", year], []]
  const yearMovements = movements.filter((movement) => movement.date.startsWith(`${year}-`))
  const groupNames = [...new Set(yearMovements.map((movement) => movement.group))]
  for (const group of groupNames) {
    const groupMovements = yearMovements.filter((movement) => movement.group === group)
    if (!groupMovements.length) continue
    rows.push([group], ["Categoría", ...months, "Total"])
    const categories = [...new Set(groupMovements.map((movement) => movement.category))].sort((a, b) => a.localeCompare(b, "es"))
    for (const category of categories) {
      const values = months.map((_, month) => groupMovements.filter((movement) => movement.category === category && new Date(`${movement.date}T12:00:00`).getMonth() === month).reduce((total, movement) => total + movement.amount, 0))
      rows.push([category, ...values, values.reduce((total, value) => total + value, 0)])
    }
    const totals = months.map((_, month) => groupMovements.filter((movement) => new Date(`${movement.date}T12:00:00`).getMonth() === month).reduce((total, movement) => total + movement.amount, 0))
    rows.push([`Total ${group}`, ...totals, totals.reduce((total, value) => total + value, 0)], [])
  }
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1:N1")
  styleTableSheet(sheet, Array.from({ length: 13 }, (_, index) => index + 1))
  cellStyle(sheet, "A1", { fill: { fgColor: { rgb: "12372A" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 15 }, alignment: { horizontal: "left", vertical: "center" } })
  cellStyle(sheet, "B1", { fill: { fgColor: { rgb: "12372A" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 15 }, alignment: { horizontal: "left", vertical: "center" } })
  for (let row = 2; row <= range.e.r; row += 1) {
    const firstCell = sheet[XLSX.utils.encode_cell({ r: row, c: 0 })] as { v?: string } | undefined
    if (!firstCell?.v) continue
    if (groupNames.includes(firstCell.v)) {
      for (let column = 0; column <= range.e.c; column += 1) cellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), { fill: { fgColor: { rgb: "D1FAE5" } }, font: { bold: true, color: { rgb: "065F46" } } })
    } else if (firstCell.v === "Categoría") {
      for (let column = 0; column <= range.e.c; column += 1) cellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), { fill: { fgColor: { rgb: "0F766E" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: column === 0 ? "left" : "center" } })
    } else if (firstCell.v.startsWith("Total")) {
      for (let column = 0; column <= range.e.c; column += 1) cellStyle(sheet, XLSX.utils.encode_cell({ r: row, c: column }), { fill: { fgColor: { rgb: "FEF3C7" } }, font: { bold: true }, border: { ...tableBorder, bottom: { style: "double", color: { rgb: "D97706" } } } })
    }
  }
  sheet["!cols"] = [{ wch: 26 }, ...months.map(() => ({ wch: 14 })), { wch: 16 }]
  sheet["!freeze"] = { xSplit: 1, ySplit: 2 }
  return sheet
}

export function downloadExcelBackup(movements: Movement[]) {
  const workbook = XLSX.utils.book_new()
  const years = [...new Set(movements.map((movement) => movement.date.slice(0, 4)))].sort()
  years.forEach((year) => XLSX.utils.book_append_sheet(workbook, buildYearSheet(movements, Number(year)), year))
  const detail = movements.slice().sort((a, b) => b.date.localeCompare(a.date)).map((movement) => ({ Fecha: movement.date, Tipo: movement.type === "income" ? "Ingreso" : "Gasto", Sección: movement.group, Categoría: movement.category, Detalle: movement.note, Monto: movement.amount, Estado: movement.installmentId ? movement.paid ? "Pagada" : "Pendiente" : "Registrado", Cuota: movement.installmentId ? `${movement.installmentNumber}/${movement.installmentTotal}` : "" }))
  const movementsSheet = XLSX.utils.json_to_sheet(detail)
  styleDetailSheet(movementsSheet)
  XLSX.utils.book_append_sheet(workbook, movementsSheet, "Movimientos")
  const installments = detail.filter((movement) => movement.Cuota)
  const installmentsSheet = XLSX.utils.json_to_sheet(installments)
  styleDetailSheet(installmentsSheet)
  XLSX.utils.book_append_sheet(workbook, installmentsSheet, "Cuotas")
  XLSX.writeFile(workbook, `finanzas-${new Date().toISOString().slice(0, 10)}.xlsx`)
}