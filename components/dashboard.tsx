"use client"
import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { useFinance } from "@/context/finance-context"
import { Button } from "@/components/ui/button"
import { DollarSign, LogOut } from "lucide-react"
import { TablesList } from "./tables-list"
import { TableDashboard } from "./table-dashboard"

export function Dashboard() {
  const { user, logout } = useAuth()
  const { tables } = useFinance()
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)

  const selectedTable = tables.find((t) => t.id === selectedTableId)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">Bolsaldo</h1>
              <p className="text-xs text-muted-foreground">Hola, {user?.username}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        {selectedTable ? (
          <TableDashboard table={selectedTable} onBack={() => setSelectedTableId(null)} />
        ) : (
          <TablesList onSelectTable={setSelectedTableId} />
        )}
      </main>
    </div>
  )
}