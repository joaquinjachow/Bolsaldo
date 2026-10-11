"use client"
import { useMemo } from "react"
import type { FinanceTable, Transaction } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, TrendingDown, Scale, Calendar } from "lucide-react"

interface YearlyViewProps {
  table: FinanceTable
  transactions: Transaction[]
  year: number
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

export function YearlyView({ table, transactions, year }: YearlyViewProps) {
  const incomeSectionIds = useMemo(
    () => table.sections.filter((s) => s.type === "income").map((s) => s.id),
    [table.sections]
  )

  const expenseSectionIds = useMemo(
    () => table.sections.filter((s) => s.type === "expense").map((s) => s.id),
    [table.sections]
  )

  const { sectionTotals, totalIncome, totalExpenses, monthlyData } = useMemo(() => {
    const sectionTotals: Record<string, Record<string, number>> = {}
    const monthlyData: Array<{ month: string; income: number; expense: number }> = []

    // Initialize section totals
    table.sections.forEach((section) => {
      sectionTotals[section.id] = {}
      section.categories.forEach((cat) => {
        sectionTotals[section.id][cat] = 0
      })
    })

    // Calculate monthly data
    for (let m = 0; m < 12; m++) {
      const monthTransactions = transactions.filter((t) => {
        const date = new Date(t.date)
        return date.getMonth() === m
      })

      const income = monthTransactions
        .filter((t) => incomeSectionIds.includes(t.sectionId))
        .reduce((sum, t) => sum + t.amount, 0)

      const expense = monthTransactions
        .filter((t) => expenseSectionIds.includes(t.sectionId))
        .reduce((sum, t) => sum + t.amount, 0)

      monthlyData.push({ month: MONTHS[m], income, expense })
    }

    // Calculate totals by category
    transactions.forEach((t) => {
      if (sectionTotals[t.sectionId]?.[t.category] !== undefined) {
        sectionTotals[t.sectionId][t.category] += t.amount
      }
    })

    const totalIncome = transactions
      .filter((t) => incomeSectionIds.includes(t.sectionId))
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = transactions
      .filter((t) => expenseSectionIds.includes(t.sectionId))
      .reduce((sum, t) => sum + t.amount, 0)

    return { sectionTotals, totalIncome, totalExpenses, monthlyData }
  }, [table, transactions, incomeSectionIds, expenseSectionIds])

  const balance = totalIncome - totalExpenses

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Resumen Anual {year}</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-300 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
              <TrendingUp className="w-4 h-4" />
              Total Ingresos Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-700 tabular-nums">
              ${totalIncome.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <TrendingDown className="w-4 h-4" />
              Total Gastos Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 tabular-nums">
              ${totalExpenses.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className={balance >= 0 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
              <Scale className="w-4 h-4" />
              Balance Anual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold tabular-nums ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
              ${balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyData.map((data) => (
                  <TableRow key={data.month}>
                    <TableCell className="font-medium">{data.month}</TableCell>
                    <TableCell className="text-right text-green-700 tabular-nums">
                      ${data.income.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-amber-700 tabular-nums">
                      ${data.expense.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right font-medium tabular-nums ${data.income - data.expense >= 0 ? "text-green-700" : "text-red-700"}`}>
                      ${(data.income - data.expense).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold border-t-2 bg-muted/50">
                  <TableCell>Total Anual</TableCell>
                  <TableCell className="text-right text-green-700 tabular-nums">
                    ${totalIncome.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right text-amber-700 tabular-nums">
                    ${totalExpenses.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                    ${balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {table.sections.map((section) => {
          const sectionTotal = Object.values(sectionTotals[section.id] || {}).reduce((a, b) => a + b, 0)
          const isIncome = section.type === "income"

          return (
            <Card key={section.id}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-base ${isIncome ? "text-green-700" : "text-amber-700"}`}>
                  {section.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Total Anual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.categories.map((cat) => (
                      <TableRow key={cat}>
                        <TableCell>{cat}</TableCell>
                        <TableCell className={`text-right font-medium tabular-nums ${isIncome ? "text-green-700" : "text-amber-700"}`}>
                          ${(sectionTotals[section.id]?.[cat] || 0).toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className={`text-right tabular-nums ${isIncome ? "text-green-700" : "text-amber-700"}`}>
                        ${sectionTotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}