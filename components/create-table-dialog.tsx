"use client"
import { useState } from "react"
import { useFinance } from "@/context/finance-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Plus, X, Layers } from "lucide-react"
import type { TableSection } from "@/lib/types"

interface CreateTableDialogProps {
  onTableCreated?: (tableId: string) => void
}

const SECTION_COLORS = [
  { value: "bg-green-600", label: "Verde", preview: "bg-green-500" },
  { value: "bg-amber-500", label: "Naranja", preview: "bg-amber-500" },
  { value: "bg-blue-600", label: "Azul", preview: "bg-blue-500" },
  { value: "bg-red-500", label: "Rojo", preview: "bg-red-500" },
  { value: "bg-purple-600", label: "Morado", preview: "bg-purple-500" },
  { value: "bg-teal-600", label: "Teal", preview: "bg-teal-500" },
]

interface SectionDraft {
  name: string
  type: 'income' | 'expense'
  categories: string[]
  color: string
}

export function CreateTableDialog({ onTableCreated }: CreateTableDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [sections, setSections] = useState<SectionDraft[]>([
    { name: "Ingresos", type: "income", categories: [], color: "bg-green-600" },
    { name: "Gastos Fijos", type: "expense", categories: [], color: "bg-amber-500" },
  ])
  const [categoryInputs, setCategoryInputs] = useState<Record<number, string>>({})
  const { createTable } = useFinance()

  const addSection = () => {
    setSections([...sections, { name: "", type: "expense", categories: [], color: "bg-blue-600" }])
  }

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index))
  }

  const updateSection = (index: number, updates: Partial<SectionDraft>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  const addCategory = (sectionIndex: number) => {
    const input = categoryInputs[sectionIndex]?.trim()
    if (input) {
      const section = sections[sectionIndex]
      updateSection(sectionIndex, { categories: [...section.categories, input] })
      setCategoryInputs({ ...categoryInputs, [sectionIndex]: "" })
    }
  }

  const removeCategory = (sectionIndex: number, catIndex: number) => {
    const section = sections[sectionIndex]
    updateSection(sectionIndex, {
      categories: section.categories.filter((_, i) => i !== catIndex),
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent, sectionIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addCategory(sectionIndex)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    
    const validSections = sections.filter(s => s.name.trim() && s.categories.length > 0)
    if (validSections.length === 0) return

    const table = createTable(
      name.trim(),
      validSections.map(s => ({
        name: s.name.trim(),
        type: s.type,
        categories: s.categories,
        color: s.color,
      }))
    )

    setName("")
    setSections([
      { name: "Ingresos", type: "income", categories: [], color: "bg-green-600" },
      { name: "Gastos Fijos", type: "expense", categories: [], color: "bg-amber-500" },
    ])
    setCategoryInputs({})
    setOpen(false)
    onTableCreated?.(table.id)
  }

  const isValid = name.trim() && sections.some(s => s.name.trim() && s.categories.length > 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          Nueva Tabla
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tabla</DialogTitle>
          <DialogDescription>
            Crea secciones (como Ingresos, Gastos Fijos, Gastos varios) con sus categorias
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel>Nombre de la tabla</FieldLabel>
              <Input
                placeholder="Ej: Bolsaldo 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
          </FieldGroup>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Secciones</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSection} className="gap-1">
                <Layers className="w-4 h-4" />
                Agregar Seccion
              </Button>
            </div>
            {sections.map((section, sectionIdx) => (
              <div
                key={sectionIdx}
                className="border border-border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel>Nombre de seccion</FieldLabel>
                      <Input
                        placeholder="Ej: Gastos Fijos"
                        value={section.name}
                        onChange={(e) => updateSection(sectionIdx, { name: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field>
                        <FieldLabel>Tipo</FieldLabel>
                        <Select
                          value={section.type}
                          onValueChange={(v) => updateSection(sectionIdx, { type: v as 'income' | 'expense' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Ingreso</SelectItem>
                            <SelectItem value="expense">Gasto</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel>Color</FieldLabel>
                        <Select
                          value={section.color}
                          onValueChange={(v) => updateSection(sectionIdx, { color: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTION_COLORS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <span className="flex items-center gap-2">
                                  <span className={`w-3 h-3 rounded-full ${c.preview}`} />
                                  {c.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </div>
                  {sections.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(sectionIdx)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <Field>
                  <FieldLabel>Categorias</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: Sueldo, Alquiler, Comida..."
                      value={categoryInputs[sectionIdx] || ""}
                      onChange={(e) =>
                        setCategoryInputs({ ...categoryInputs, [sectionIdx]: e.target.value })
                      }
                      onKeyDown={(e) => handleKeyDown(e, sectionIdx)}
                    />
                    <Button type="button" variant="outline" onClick={() => addCategory(sectionIdx)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {section.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {section.categories.map((cat, catIdx) => (
                        <span
                          key={catIdx}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                            section.type === "income"
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => removeCategory(sectionIdx, catIdx)}
                            className="hover:opacity-70 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid}>
              Crear Tabla
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}