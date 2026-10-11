"use client"
import { useMemo } from "react"
import { useFinance } from "@/context/finance-context"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { Table2, Trash2, ArrowRight } from "lucide-react"
import { CreateTableDialog } from "./create-table-dialog"

interface TablesListProps {
  onSelectTable: (tableId: string) => void
}

export function TablesList({ onSelectTable }: TablesListProps) {
  const { tables, deleteTable, getTableTransactions } = useFinance()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getTableStats = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return { income: 0, expenses: 0, balance: 0 }

    const incomeSectionIds = table.sections
      .filter((s) => s.type === "income")
      .map((s) => s.id)
    const expenseSectionIds = table.sections
      .filter((s) => s.type === "expense")
      .map((s) => s.id)

    const transactions = getTableTransactions(tableId)
    const income = transactions
      .filter((t) => incomeSectionIds.includes(t.sectionId))
      .reduce((sum, t) => sum + t.amount, 0)
    const expenses = transactions
      .filter((t) => expenseSectionIds.includes(t.sectionId))
      .reduce((sum, t) => sum + t.amount, 0)
    return { income, expenses, balance: income - expenses }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mis Tablas</h2>
          <p className="text-muted-foreground">Gestiona tus tablas de ingresos y gastos</p>
        </div>
        <CreateTableDialog onTableCreated={onSelectTable} />
      </div>
      {tables.length === 0 ? (
        <Empty className="py-12">
          <EmptyMedia variant="icon">
            <Table2 className="w-6 h-6" />
          </EmptyMedia>
          <EmptyTitle>No hay tablas creadas</EmptyTitle>
          <EmptyDescription>
            Crea tu primera tabla para empezar a registrar tus ingresos y gastos
          </EmptyDescription>
          <div className="mt-4">
            <CreateTableDialog onTableCreated={onSelectTable} />
          </div>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tables.map((table) => {
            const stats = getTableStats(table.id)
            return (
              <Card
                key={table.id}
                className="relative group hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectTable(table.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{table.name}</CardTitle>
                      <CardDescription>
                        {table.sections.length} secciones - Creada el {formatDate(table.createdAt)}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTable(table.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {table.sections.map((section) => (
                      <span
                        key={section.id}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          section.type === "income"
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {section.name}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Ingresos</p>
                      <p className="text-sm font-semibold text-green-700 tabular-nums">
                        ${stats.income.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Gastos</p>
                      <p className="text-sm font-semibold text-amber-700 tabular-nums">
                        ${stats.expenses.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className={`text-sm font-semibold tabular-nums ${stats.balance >= 0 ? "text-green-700" : "text-red-700"}`}>
                        ${stats.balance.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-4 text-sm text-primary gap-1">
                    Ver detalles <ArrowRight className="w-4 h-4" />
                  </div>
                </CardHeader>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}