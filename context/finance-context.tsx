"use client"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { FinanceTable, Transaction, TableSection } from "@/lib/types"

interface FinanceContextType {
  tables: FinanceTable[]
  transactions: Transaction[]
  createTable: (name: string, sections: Omit<TableSection, "id">[]) => FinanceTable
  deleteTable: (id: string) => void
  addSection: (tableId: string, section: Omit<TableSection, "id">) => void
  updateSection: (tableId: string, sectionId: string, categories: string[]) => void
  deleteSection: (tableId: string, sectionId: string) => void
  addCategory: (tableId: string, sectionId: string, categoryName: string) => void
  renameCategory: (tableId: string, sectionId: string, oldName: string, newName: string) => void
  deleteCategory: (tableId: string, sectionId: string, categoryName: string) => void
  addTransaction: (transaction: Omit<Transaction, "id" | "createdAt">) => void
  deleteTransaction: (id: string) => void
  getTableTransactions: (tableId: string) => Transaction[]
  getMonthlyTransactions: (tableId: string, year: number, month: number) => Transaction[]
  getYearlyTransactions: (tableId: string, year: number) => Transaction[]
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [tables, setTables] = useState<FinanceTable[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const storedTables = localStorage.getItem("finance-tables-v2")
    const storedTransactions = localStorage.getItem("finance-transactions-v2")
    if (storedTables) setTables(JSON.parse(storedTables))
    if (storedTransactions) setTransactions(JSON.parse(storedTransactions))
  }, [])

  useEffect(() => {
    localStorage.setItem("finance-tables-v2", JSON.stringify(tables))
  }, [tables])

  useEffect(() => {
    localStorage.setItem("finance-transactions-v2", JSON.stringify(transactions))
  }, [transactions])

  const createTable = (name: string, sections: Omit<TableSection, "id">[]): FinanceTable => {
    const newTable: FinanceTable = {
      id: crypto.randomUUID(),
      name,
      sections: sections.map(s => ({ ...s, id: crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
    }
    setTables((prev) => [...prev, newTable])
    return newTable
  }

  const deleteTable = (id: string) => {
    setTables((prev) => prev.filter((t) => t.id !== id))
    setTransactions((prev) => prev.filter((t) => t.tableId !== id))
  }

  const addSection = (tableId: string, section: Omit<TableSection, "id">) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, sections: [...table.sections, { ...section, id: crypto.randomUUID() }] }
          : table
      )
    )
  }

  const updateSection = (tableId: string, sectionId: string, categories: string[]) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? {
              ...table,
              sections: table.sections.map((s) =>
                s.id === sectionId ? { ...s, categories } : s
              ),
            }
          : table
      )
    )
  }

  const deleteSection = (tableId: string, sectionId: string) => {
    setTables((prev) =>
      prev.map((table) =>
        table.id === tableId
          ? { ...table, sections: table.sections.filter((s) => s.id !== sectionId) }
          : table
      )
    )
    setTransactions((prev) => prev.filter((t) => t.sectionId !== sectionId))
  }

  const addTransaction = (transaction: Omit<Transaction, "id" | "createdAt">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    setTransactions((prev) => [...prev, newTransaction])
  }

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const getTableTransactions = (tableId: string) => {
    return transactions.filter((t) => t.tableId === tableId)
  }

  const getMonthlyTransactions = (tableId: string, year: number, month: number) => {
    return transactions.filter((t) => {
      const date = new Date(t.date)
      return t.tableId === tableId && date.getFullYear() === year && date.getMonth() === month
    })
  }

  const getYearlyTransactions = (tableId: string, year: number) => {
    return transactions.filter((t) => {
      const date = new Date(t.date)
      return t.tableId === tableId && date.getFullYear() === year
    })
  }

  return (
    <FinanceContext.Provider
      value={{
        tables,
        transactions,
        createTable,
        deleteTable,
        addSection,
        updateSection,
        deleteSection,
        addTransaction,
        deleteTransaction,
        getTableTransactions,
        getMonthlyTransactions,
        getYearlyTransactions,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider")
  }
  return context
}