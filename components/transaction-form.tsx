"use client"
import { useState, useMemo } from "react"
import { useFinance } from "@/context/finance-context"
import type { FinanceTable } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface TransactionFormProps {
  table: FinanceTable
}

export function TransactionForm({ table }: TransactionFormProps) {
  const today = new Date().toISOString().split("T")[0]
  const [sectionId, setSectionId] = useState("")
  const [category, setCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(today)
  const { addTransaction } = useFinance()

  const selectedSection = useMemo(
    () => table.sections.find((s) => s.id === sectionId),
    [table.sections, sectionId]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sectionId || !category || !amount || !description) return

    addTransaction({
      tableId: table.id,
      sectionId,
      category,
      amount: parseFloat(amount),
      description,
      date,
    })

    setAmount("")
    setDescription("")
    setCategory("")
  }

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Agregar Movimiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel>Fecha</FieldLabel>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Seccion</FieldLabel>
              <Select
                value={sectionId}
                onValueChange={(v) => {
                  setSectionId(v)
                  setCategory("")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una seccion" />
                </SelectTrigger>
                <SelectContent>
                  {table.sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${section.color.replace("bg-", "bg-")}`}
                          style={{
                            backgroundColor:
                              section.type === "income" ? "#22c55e" : "#f59e0b",
                          }}
                        />
                        {section.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {selectedSection && (
              <Field>
                <FieldLabel>Categoria</FieldLabel>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSection.categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel>Monto ($)</FieldLabel>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </Field>
            <Field>
              <FieldLabel>Descripcion</FieldLabel>
              <Input
                placeholder="Ej: Sueldo de Marzo, Netflix..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <Button
            type="submit"
            className="w-full"
            disabled={!sectionId || !category || !amount || !description}
          >
            Agregar{" "}
            {selectedSection
              ? selectedSection.type === "income"
                ? "Ingreso"
                : "Gasto"
              : "Movimiento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}