export interface Transaction {
  id: string
  tableId: string
  sectionId: string
  category: string
  amount: number
  description: string
  date: string
  createdAt: string
}

export interface TableSection {
  id: string
  name: string
  type: 'income' | 'expense'
  categories: string[]
  color: string
}

export interface FinanceTable {
  id: string
  name: string
  sections: TableSection[]
  createdAt: string
}

export interface User {
  username: string
  isAuthenticated: boolean
}

export interface Movement {
  id: string
  type: 'income' | 'expense'
  group: string
  category: string
  amount: number
  date: string
  note: string
  createdAt: string
  installmentId?: string | null
  installmentNumber?: number | null
  installmentTotal?: number | null
  paid?: boolean
  currency?: Currency
  attachmentPath?: string | null
}

export type Currency = 'ARS' | 'USD' | 'EUR' | 'BRL'

export interface FinanceGroupConfig {
  id: string
  name: string
  type: 'income' | 'expense'
}

export interface FinanceCategoryConfig {
  id: string
  groupId: string
  name: string
}
