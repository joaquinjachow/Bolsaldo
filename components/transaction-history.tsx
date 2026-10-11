"use client"
import { useMemo, useState } from "react"
import type { Transaction, FinanceTable } from "@/lib/types"
import { useFinance } from "@/context/finance-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { History, Trash2, Search, TrendingUp, TrendingDown } from "lucide-react"

interface TransactionHistoryProps {
  table: FinanceTable
  transactions: Transaction[]
}

export function TransactionHistory({ table, transactions }: TransactionHistoryProps) {
  const [search, setSearch] = useState("")
  const { deleteTransaction } = useFinance()

  const sectionMap = useMemo(() => {
    const map: Record<string, { name: string; type: 'income' | 'expense' }> = {}
    table.sections.forEach((s) => {
      map[s.id] = { name: s.name, type: s.type }
    })
    return map
  }, [table.sections])

  const sortedTransactions = useMemo(() => {
    let filtered = [...transactions]

    if (search.trim()) {
      const query = search.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          (sectionMap[t.sectionId]?.name || "").toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, search, sectionMap])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Movimientos
          </CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripcion..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? "No se encontraron movimientos" : "No hay movimientos registrados"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Seccion</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => {
                  const section = sectionMap[transaction.sectionId]
                  const isIncome = section?.type === "income"

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            isIncome
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isIncome ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {section?.name || "Desconocido"}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={transaction.description}>
                        {transaction.description}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium tabular-nums ${
                          isIncome ? "text-green-700" : "text-amber-700"
                        }`}
                      >
                        {isIncome ? "+" : "-"}$
                        {transaction.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}