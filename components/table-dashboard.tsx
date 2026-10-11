"use client"
import { useState, useMemo } from "react"
import { useFinance } from "@/context/finance-context"
import type { FinanceTable } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Table2, BarChart3, History } from "lucide-react"
import { TransactionForm } from "./transaction-form"
import { ExcelTableView } from "./excel-table-view"
import { MonthlyView } from "./monthly-view"
import { YearlyView } from "./yearly-view"
import { TransactionHistory } from "./transaction-history"

interface TableDashboardProps {
  table: FinanceTable
  onBack: () => void
}

export function TableDashboard({ table, onBack }: TableDashboardProps) {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState("excel")
  const { getYearlyTransactions, getTableTransactions } = useFinance()

  const yearlyTransactions = useMemo(
    () => getYearlyTransactions(table.id, selectedYear),
    [table.id, selectedYear, getYearlyTransactions]
  )

  const allTransactions = useMemo(
    () => getTableTransactions(table.id),
    [table.id, getTableTransactions]
  )

  const years = useMemo(() => {
    const currentYear = now.getFullYear()
    return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  }, [])

  const totalIncome = useMemo(() => {
    const incomeSectionIds = table.sections
      .filter((s) => s.type === "income")
      .map((s) => s.id)
    return yearlyTransactions
      .filter((t) => incomeSectionIds.includes(t.sectionId))
      .reduce((sum, t) => sum + t.amount, 0)
  }, [yearlyTransactions, table.sections])

  const totalExpense = useMemo(() => {
    const expenseSectionIds = table.sections
      .filter((s) => s.type === "expense")
      .map((s) => s.id)
    return yearlyTransactions
      .filter((t) => expenseSectionIds.includes(t.sectionId))
      .reduce((sum, t) => sum + t.amount, 0)
  }, [yearlyTransactions, table.sections])

  const balance = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{table.name}</h2>
            <p className="text-muted-foreground text-sm">
              {table.sections.length} secciones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total Ingresos</p>
          <p className="text-2xl font-bold text-green-700 tabular-nums">
            ${totalIncome.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-600 font-medium">Total Gastos</p>
          <p className="text-2xl font-bold text-amber-700 tabular-nums">
            ${totalExpense.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div
          className={`rounded-lg p-4 ${
            balance >= 0
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              balance >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            Balance
          </p>
          <p
            className={`text-2xl font-bold tabular-nums ${
              balance >= 0 ? "text-green-700" : "text-red-700"
            }`}
          >
            ${balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <TransactionForm table={table} />
        </div>
        <div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="excel" className="gap-2">
                <Table2 className="w-4 h-4" />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="charts" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                Historial
              </TabsTrigger>
            </TabsList>
            <TabsContent value="excel">
              <ExcelTableView
                table={table}
                transactions={yearlyTransactions}
                year={selectedYear}
              />
            </TabsContent>
            <TabsContent value="charts">
              <YearlyView
                table={table}
                transactions={yearlyTransactions}
                year={selectedYear}
              />
            </TabsContent>
            <TabsContent value="history">
              <TransactionHistory table={table} transactions={allTransactions} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}