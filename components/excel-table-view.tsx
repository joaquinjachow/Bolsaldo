"use client"
import { useMemo } from "react"
import type { FinanceTable, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ExcelTableViewProps {
  table: FinanceTable
  transactions: Transaction[]
  year: number
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function ExcelTableView({ table, transactions, year }: ExcelTableViewProps) {
  const data = useMemo(() => {
    const result: Record<string, Record<string, Record<number, number>>> = {}
    
    table.sections.forEach(section => {
      result[section.id] = {}
      section.categories.forEach(category => {
        result[section.id][category] = {}
        for (let month = 0; month < 12; month++) {
          result[section.id][category][month] = 0
        }
      })
    })
    transactions.forEach(tx => {
      const date = new Date(tx.date)
      if (date.getFullYear() !== year) return
      const month = date.getMonth()
      if (result[tx.sectionId]?.[tx.category]) {
        result[tx.sectionId][tx.category][month] += tx.amount
      }
    })
    return result
  }, [table, transactions, year])

  const sectionTotals = useMemo(() => {
    const totals: Record<string, Record<number, number>> = {}
    
    table.sections.forEach(section => {
      totals[section.id] = {}
      for (let month = 0; month < 12; month++) {
        totals[section.id][month] = 0
        section.categories.forEach(category => {
          totals[section.id][month] += data[section.id]?.[category]?.[month] || 0
        })
      }
    })

    return totals
  }, [table, data])

  const yearTotals = useMemo(() => {
    const totals: Record<string, Record<string, number>> = {}
    
    table.sections.forEach(section => {
      totals[section.id] = {}
      section.categories.forEach(category => {
        totals[section.id][category] = Object.values(data[section.id]?.[category] || {}).reduce((a, b) => a + b, 0)
      })
      totals[section.id]["__total__"] = Object.values(sectionTotals[section.id] || {}).reduce((a, b) => a + b, 0)
    })

    return totals
  }, [table, data, sectionTotals])

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-card">
      <table className="w-full text-sm border-collapse min-w-[1200px]">
        <thead>
          <tr className="bg-muted/50">
            <th className="border border-border p-2 text-left font-semibold sticky left-0 bg-muted/50 min-w-[180px]">
              Categoria
            </th>
            {MONTHS.map((month) => (
              <th key={month} className="border border-border p-2 text-center font-semibold min-w-[110px]">
                {month}
              </th>
            ))}
            <th className="border border-border p-2 text-center font-bold min-w-[120px] bg-muted">
              Total Anual
            </th>
          </tr>
        </thead>
        <tbody>
          {table.sections.map((section) => (
            <SectionRows
              key={section.id}
              section={section}
              data={data[section.id] || {}}
              totals={sectionTotals[section.id] || {}}
              yearTotals={yearTotals[section.id] || {}}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SectionRowsProps {
  section: {
    id: string
    name: string
    type: 'income' | 'expense'
    categories: string[]
    color: string
  }
  data: Record<string, Record<number, number>>
  totals: Record<number, number>
  yearTotals: Record<string, number>
}

function SectionRows({ section, data, totals, yearTotals }: SectionRowsProps) {
  const isIncome = section.type === "income"
  const headerBg = section.color || (isIncome ? "bg-green-600" : "bg-amber-500")
  const headerText = isIncome ? "text-green-50" : "text-amber-950"
  const totalBg = isIncome ? "bg-green-100" : "bg-amber-100"
  const totalText = isIncome ? "text-green-800" : "text-amber-800"

  return (
    <>
      <tr>
        <td
          colSpan={14}
          className={cn(
            "border border-border p-2 font-bold text-sm sticky left-0",
            headerBg,
            headerText
          )}
        >
          {section.name}
        </td>
      </tr>
      {section.categories.map((category) => (
        <tr key={category} className="hover:bg-muted/30 transition-colors">
          <td className="border border-border p-2 pl-4 sticky left-0 bg-card">
            {category}
          </td>
          {Array.from({ length: 12 }).map((_, month) => {
            const value = data[category]?.[month] || 0
            return (
              <td
                key={month}
                className={cn(
                  "border border-border p-2 text-right tabular-nums",
                  value > 0 ? (isIncome ? "text-green-700" : "text-foreground") : "text-muted-foreground"
                )}
              >
                {formatCurrency(value)}
              </td>
            )
          })}
          <td className={cn("border border-border p-2 text-right tabular-nums font-medium", totalBg, totalText)}>
            {formatCurrency(yearTotals[category] || 0)}
          </td>
        </tr>
      ))}
      <tr className={cn(totalBg)}>
        <td className={cn("border border-border p-2 font-bold sticky left-0", totalBg, totalText)}>
          Total {section.name}
        </td>
        {Array.from({ length: 12 }).map((_, month) => (
          <td
            key={month}
            className={cn("border border-border p-2 text-right tabular-nums font-bold", totalText)}
          >
            {formatCurrency(totals[month] || 0)}
          </td>
        ))}
        <td className={cn("border border-border p-2 text-right tabular-nums font-bold", totalText, "bg-opacity-80")}>
          {formatCurrency(yearTotals["__total__"] || 0)}
        </td>
      </tr>
      <tr className="h-2">
        <td colSpan={14} className="border-0 bg-background"></td>
      </tr>
    </>
  )
}