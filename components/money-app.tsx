"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Download, FilePlus2, ImagePlus, LogOut, Moon, Pencil, Plus, ReceiptText, Search, Sun, Table2, Target, Trash2, TrendingDown, TrendingUp, WalletCards, X } from "lucide-react"
import type { Currency, FinanceCategoryConfig, FinanceGroupConfig, Movement } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { downloadExcelBackup } from "@/lib/excel-export"

const STORAGE_KEY = "billetera-movements-v1"
const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 })
const currencyLabels: Record<Currency, string> = { ARS: "Pesos (ARS)", USD: "Dólares (USD)", EUR: "Euros (EUR)", BRL: "Reales (BRL)" }
function formatMoney(value: number, currency: Currency = "ARS") { return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value) }
function amountsByCurrency(items: Movement[], type?: Movement["type"]) { return items.filter((item) => !type || item.type === type).reduce<Record<string, number>>((result, item) => { result[item.currency ?? "ARS"] = (result[item.currency ?? "ARS"] ?? 0) + item.amount; return result }, {}) }
const initialGroups: Array<Pick<FinanceGroupConfig, "name" | "type">> = [{ name: "Ingresos", type: "income" }, { name: "Gastos fijos", type: "expense" }, { name: "Gastos del día a día", type: "expense" }]
const suggestedCategories: Record<string, string[]> = { Ingresos: ["Sueldo", "Ventas", "Otros ingresos"], "Gastos fijos": ["Alquiler", "Servicios", "Suscripciones", "Cuotas compras"], "Gastos del día a día": ["Comida", "Transporte", "Salidas", "Otros"] }

function isoToday() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function userStorageKey(userId: string) {
  return `${STORAGE_KEY}-${userId}`
}

function authMessage(message: string) {
  if (message.toLowerCase().includes("invalid login credentials")) return "El email o la contraseña no son correctos."
  if (message.toLowerCase().includes("email not confirmed")) return "Confirmá tu email antes de ingresar."
  if (message.toLowerCase().includes("user already registered")) return "Ya existe una cuenta con este email. Probá iniciar sesión."
  return "No pudimos completar la acción. Revisá los datos e intentá nuevamente."
}

export function MoneyApp() {
  const [loaded, setLoaded] = useState(false)
  const [movements, setMovements] = useState<Movement[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [syncError, setSyncError] = useState("")
  const [selectedDate, setSelectedDate] = useState(() => new Date(2026, 6, 1))
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isInstallmentFormOpen, setIsInstallmentFormOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null)
  const [movementToDelete, setMovementToDelete] = useState<Movement | null>(null)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [darkMode, setDarkMode] = useState(false)
  const [groups, setGroups] = useState<FinanceGroupConfig[]>([])
  const [categories, setCategories] = useState<FinanceCategoryConfig[]>([])
  const [configLoaded, setConfigLoaded] = useState(false)
  const [view, setView] = useState<"inicio" | "movimientos" | "anual" | "planilla">("inicio")

  const loadCloudMovements = async (currentUserId: string) => {
    setSyncError("")
    let localMovements: Movement[] = []
    try {
      localMovements = JSON.parse(localStorage.getItem(userStorageKey(currentUserId)) || "[]")
    } catch {
      localStorage.removeItem(userStorageKey(currentUserId))
      setSyncError("Se reinició una copia local dañada. Tus datos sincronizados siguen protegidos.")
    }
    setMovements(localMovements)
    const { data, error } = await supabase.from("movements").select("*").order("movement_date", { ascending: false })
    if (error) {
      setSyncError("No se pudo leer tu información sincronizada.")
      return
    }
    if (data.length) {
      setMovements(data.map((item) => ({ id: item.id, type: item.type, group: item.movement_group, category: item.category, amount: Number(item.amount), date: item.movement_date, note: item.note, createdAt: item.created_at, installmentId: item.installment_id, installmentNumber: item.installment_number, installmentTotal: item.installment_total, paid: item.paid, currency: item.currency ?? "ARS", attachmentPath: item.attachment_path })))
      return
    }
    setMovements([])
  }

  const loadFinanceConfig = async (currentUserId: string) => {
    setConfigLoaded(false)
    const { data: groupData, error: groupError } = await supabase.from("finance_groups").select("*").order("created_at")
    if (groupError) {
      setSyncError("Falta preparar las categorías sincronizadas. Ejecutá la migración 0003 en Supabase.")
      setConfigLoaded(true)
      return
    }
    let nextGroups = (groupData ?? []).map((item) => ({ id: item.id, name: item.name, type: item.type as Movement["type"] }))
    if (!nextGroups.length) {
      const baseGroups = initialGroups.map((group) => ({ id: crypto.randomUUID(), user_id: currentUserId, ...group }))
      const { error } = await supabase.from("finance_groups").insert(baseGroups)
      if (error) {
        setSyncError("No se pudieron crear tus tipos iniciales.")
        setConfigLoaded(true)
        return
      }
      nextGroups = baseGroups.map(({ user_id: _userId, ...group }) => group)
    }
    const { data: categoryData, error: categoryError } = await supabase.from("finance_categories").select("*").order("created_at")
    if (categoryError) {
      setSyncError("No se pudieron leer tus categorías sincronizadas.")
      setConfigLoaded(true)
      return
    }
    let nextCategories = (categoryData ?? []).map((item) => ({ id: item.id, groupId: item.group_id, name: item.name }))
    if (!nextCategories.length) {
      const { data: movementData } = await supabase.from("movements").select("movement_group, category, type")
      const existingGroups = new Map(nextGroups.map((group) => [group.name, group]))
      const missingGroupNames = [...new Set((movementData ?? []).map((movement) => movement.movement_group).filter((name) => !existingGroups.has(name)))]
      if (missingGroupNames.length) {
        const missingGroups = missingGroupNames.map((name) => ({ id: crypto.randomUUID(), user_id: currentUserId, name, type: ((movementData ?? []).find((movement) => movement.movement_group === name)?.type ?? "expense") as Movement["type"] }))
        const { error } = await supabase.from("finance_groups").insert(missingGroups)
        if (!error) {
          nextGroups = [...nextGroups, ...missingGroups.map(({ user_id: _userId, ...group }) => group)]
          missingGroups.forEach(({ user_id: _userId, ...group }) => existingGroups.set(group.name, group))
        }
      }
      const categoryRows = [...new Map((movementData ?? []).map((movement) => [`${movement.movement_group}-${movement.category}`, movement])).values()].map((movement) => ({ id: crypto.randomUUID(), user_id: currentUserId, group_id: existingGroups.get(movement.movement_group)?.id, name: movement.category })).filter((category) => category.group_id)
      if (categoryRows.length) {
        const { error } = await supabase.from("finance_categories").insert(categoryRows)
        if (!error) nextCategories = categoryRows.map(({ user_id: _userId, group_id, ...category }) => ({ ...category, groupId: group_id as string }))
      }
    }
    setGroups(nextGroups)
    setCategories(nextCategories)
    setConfigLoaded(true)
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined)
    const loadingTimeout = window.setTimeout(() => { setSyncError("La sincronización está tardando más de lo esperado. Podés seguir usando la app y reintentar luego."); setLoaded(true) }, 8000)
    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUserId(session.user.id)
          await loadCloudMovements(session.user.id)
          await loadFinanceConfig(session.user.id)
        }
      } catch {
        setSyncError("No se pudo iniciar la sincronización. Revisá tu conexión e intentá de nuevo.")
      } finally {
        window.clearTimeout(loadingTimeout)
        setLoaded(true)
      }
    }
    void initialize()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null))
    return () => { window.clearTimeout(loadingTimeout); subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (loaded && userId) localStorage.setItem(userStorageKey(userId), JSON.stringify(movements))
  }, [loaded, movements, userId])

  useEffect(() => { if (userId) setDarkMode(localStorage.getItem(`billetera-dark-${userId}`) === "true") }, [userId])
  useEffect(() => { if (userId) localStorage.setItem(`billetera-dark-${userId}`, String(darkMode)) }, [darkMode, userId])

  const year = selectedDate.getFullYear()
  const month = selectedDate.getMonth()
  const monthRows = useMemo(() => movements.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`)
    return date.getFullYear() === year && date.getMonth() === month
  }), [movements, month, year])
  const incomeByCurrency = useMemo(() => amountsByCurrency(monthRows, "income"), [monthRows])
  const expenseByCurrency = useMemo(() => amountsByCurrency(monthRows, "expense"), [monthRows])
  const balanceByCurrency = useMemo(() => [...new Set([...Object.keys(incomeByCurrency), ...Object.keys(expenseByCurrency)])].reduce<Record<string, number>>((result, currency) => { result[currency] = (incomeByCurrency[currency] ?? 0) - (expenseByCurrency[currency] ?? 0); return result }, {}), [expenseByCurrency, incomeByCurrency])
  const expensesByCategory = useMemo(() => Object.values(monthRows.filter((item) => item.type === "expense").reduce<Record<string, { category: string; currency: Currency; amount: number }>>((acc, item) => { const currency = item.currency ?? "ARS"; const key = `${item.category}-${currency}`; acc[key] = { category: item.category, currency, amount: (acc[key]?.amount ?? 0) + item.amount }; return acc }, {})).sort((a, b) => b.amount - a.amount), [monthRows])
  const filteredMonthRows = useMemo(() => monthRows.filter((item) => (categoryFilter === "all" || item.category === categoryFilter) && `${item.category} ${item.note}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [categoryFilter, monthRows, search])
  const upcomingInstallments = useMemo(() => movements.filter((movement) => movement.installmentId && movement.date >= isoToday()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6), [movements])

  const changeMonth = (direction: number) => setSelectedDate((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  const uploadAttachment = async (file: File | null, movementId: string) => {
    if (!file || !userId) return null
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const path = `${userId}/${movementId}.${extension}`
    const { error } = await supabase.storage.from("movement-receipts").upload(path, file, { upsert: true })
    if (error) { setSyncError("No se pudo subir la foto del comprobante."); return null }
    return path
  }
  const addMovement = async (movement: Omit<Movement, "id" | "createdAt" | "attachmentPath">, attachment: File | null = null) => {
    if (!userId) return
    const id = crypto.randomUUID()
    const attachmentPath = await uploadAttachment(attachment, id)
    const newMovement = { ...movement, id, createdAt: new Date().toISOString(), attachmentPath }
    const { error } = await supabase.from("movements").insert({ id: newMovement.id, user_id: userId, type: newMovement.type, movement_group: newMovement.group, category: newMovement.category, amount: newMovement.amount, movement_date: newMovement.date, note: newMovement.note, created_at: newMovement.createdAt, currency: newMovement.currency ?? "ARS", attachment_path: attachmentPath })
    if (error) {
      setSyncError("No se pudo guardar. Revisá tu conexión e intentá de nuevo.")
      return
    }
    setMovements((current) => [newMovement, ...current])
    setIsFormOpen(false)
  }
  const updateMovement = async (movement: Movement, attachment: File | null = null) => {
    const attachmentPath = attachment ? await uploadAttachment(attachment, movement.id) : movement.attachmentPath ?? null
    const { error } = await supabase.from("movements").update({ type: movement.type, movement_group: movement.group, category: movement.category, amount: movement.amount, movement_date: movement.date, note: movement.note, currency: movement.currency ?? "ARS", attachment_path: attachmentPath }).eq("id", movement.id)
    if (error) { setSyncError("No se pudo editar el movimiento."); return }
    setMovements((current) => current.map((item) => item.id === movement.id ? { ...movement, attachmentPath } : item))
    setEditingMovement(null)
  }
  const addGroup = async (name: string, type: Movement["type"]) => {
    if (!userId) return
    const group = { id: crypto.randomUUID(), user_id: userId, name: name.trim(), type }
    if (!group.name) return
    const { error } = await supabase.from("finance_groups").insert(group)
    if (error) setSyncError("No se pudo crear ese tipo. Revisá que no exista otro con el mismo nombre.")
    else setGroups((current) => [...current, { id: group.id, name: group.name, type: group.type }])
  }
  const renameGroup = async (group: FinanceGroupConfig, name: string) => {
    const nextName = name.trim()
    if (!nextName || nextName === group.name) return
    const { error } = await supabase.from("finance_groups").update({ name: nextName }).eq("id", group.id)
    if (error) { setSyncError("No se pudo renombrar ese tipo."); return }
    const { error: movementError } = await supabase.from("movements").update({ movement_group: nextName }).eq("movement_group", group.name)
    if (movementError) setSyncError("El tipo se renombró, pero no se pudieron actualizar algunos movimientos anteriores.")
    setGroups((current) => current.map((item) => item.id === group.id ? { ...item, name: nextName } : item))
    setMovements((current) => current.map((item) => item.group === group.name ? { ...item, group: nextName } : item))
  }
  const deleteGroup = async (group: FinanceGroupConfig) => {
    const { error } = await supabase.from("finance_groups").delete().eq("id", group.id)
    if (error) { setSyncError("No se pudo borrar ese tipo."); return }
    setGroups((current) => current.filter((item) => item.id !== group.id))
    setCategories((current) => current.filter((item) => item.groupId !== group.id))
  }
  const addCategory = async (groupId: string, name: string) => {
    if (!userId) return
    const category = { id: crypto.randomUUID(), user_id: userId, group_id: groupId, name: name.trim() }
    if (!category.name) return
    const { error } = await supabase.from("finance_categories").insert(category)
    if (error) setSyncError("No se pudo crear esa categoría. Revisá que no esté repetida.")
    else setCategories((current) => [...current, { id: category.id, groupId, name: category.name }])
  }
  const renameCategory = async (category: FinanceCategoryConfig, name: string) => {
    const nextName = name.trim()
    if (!nextName || nextName === category.name) return
    const { error } = await supabase.from("finance_categories").update({ name: nextName }).eq("id", category.id)
    if (error) { setSyncError("No se pudo renombrar esa categoría."); return }
    const group = groups.find((item) => item.id === category.groupId)
    if (group) await supabase.from("movements").update({ category: nextName }).eq("movement_group", group.name).eq("category", category.name)
    setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: nextName } : item))
    if (group) setMovements((current) => current.map((item) => item.group === group.name && item.category === category.name ? { ...item, category: nextName } : item))
  }
  const deleteCategory = async (category: FinanceCategoryConfig) => {
    const { error } = await supabase.from("finance_categories").delete().eq("id", category.id)
    if (error) setSyncError("No se pudo borrar esa categoría.")
    else setCategories((current) => current.filter((item) => item.id !== category.id))
  }
  const useSuggestions = async () => {
    for (const group of groups) for (const name of suggestedCategories[group.name] ?? []) if (!categories.some((category) => category.groupId === group.id && category.name === name)) await addCategory(group.id, name)
  }
  const deleteMovement = async (id: string) => {
    if (!movementToDelete || movementToDelete.id !== id) {
      const movement = movements.find((item) => item.id === id)
      if (movement) setMovementToDelete(movement)
      return
    }
    const movement = movements.find((item) => item.id === id)
    if (movement?.attachmentPath) await supabase.storage.from("movement-receipts").remove([movement.attachmentPath])
    const { error } = await supabase.from("movements").delete().eq("id", id)
    if (error) setSyncError("No se pudo eliminar el movimiento.")
    else setMovements((current) => current.filter((item) => item.id !== id))
    setMovementToDelete(null)
  }
  const addInstallments = async (title: string, amount: number, count: number, firstDate: string) => {
    if (!userId) return
    const installmentId = crypto.randomUUID()
    const firstDueDate = new Date(`${firstDate}T12:00:00`)
    const installments: Movement[] = Array.from({ length: count }, (_, index) => {
      const dueDate = new Date(firstDueDate.getFullYear(), firstDueDate.getMonth() + index, firstDueDate.getDate())
      return { id: `${installmentId}-${index + 1}`, type: "expense", group: "Gastos fijos", category: "Cuotas compras", amount, date: dueDate.toISOString().slice(0, 10), note: title, createdAt: new Date().toISOString(), installmentId, installmentNumber: index + 1, installmentTotal: count, paid: false }
    })
    const { error } = await supabase.from("movements").insert(installments.map((movement) => ({ id: movement.id, user_id: userId, type: movement.type, movement_group: movement.group, category: movement.category, amount: movement.amount, movement_date: movement.date, note: movement.note, created_at: movement.createdAt, installment_id: movement.installmentId, installment_number: movement.installmentNumber, installment_total: movement.installmentTotal, paid: false })))
    if (error) {
      setSyncError("No se pudieron crear las cuotas. Ejecutá primero la migración de cuotas en Supabase.")
      return
    }
    setMovements((current) => [...installments, ...current])
    setIsInstallmentFormOpen(false)
  }
  const toggleInstallmentPayment = async (id: string, paid: boolean) => {
    const previous = movements.find((movement) => movement.id === id)?.paid ?? false
    setMovements((current) => current.map((movement) => movement.id === id ? { ...movement, paid } : movement))
    const { error } = await supabase.from("movements").update({ paid }).eq("id", id)
    if (error) {
      setMovements((current) => current.map((movement) => movement.id === id ? { ...movement, paid: previous } : movement))
      setSyncError("No se pudo actualizar el estado de la cuota.")
    }
  }
  const exportBackup = () => downloadExcelBackup(movements)
  const logout = async () => {
    await supabase.auth.signOut().catch(() => undefined)
    setUserId(null)
    setMovements([])
    setGroups([])
    setCategories([])
    setConfigLoaded(false)
    localStorage.clear()
    sessionStorage.clear()
    if ("caches" in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)))
    if ("serviceWorker" in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((registration) => registration.unregister()))
  }

  if (!loaded) return <main className="grid min-h-screen place-items-center bg-[#f7faf9] p-6 text-slate-900"><div className="w-full max-w-xs text-center"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#0f766e] text-white shadow-xl shadow-emerald-100"><WalletCards size={28} /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-[#0f766e]">Bolsaldo</p><h1 className="mt-2 text-2xl font-black tracking-tight">Preparando tu resumen</h1><p className="mt-2 text-sm text-slate-500">Estamos sincronizando tus movimientos.</p><div className="mt-6 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full w-2/5 animate-pulse rounded-full bg-[#0f766e]" /></div></div></main>

  if (!userId) return <AuthScreen onAuthenticated={async (id) => { setUserId(id); await loadCloudMovements(id); await loadFinanceConfig(id) }} />

  return (
    <main className={`${darkMode ? "dark" : ""} min-h-screen bg-background pb-24 text-foreground`}>
      <div className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-[#0f766e] text-white shadow-lg shadow-emerald-100"><WalletCards size={22} /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Registro personal</p><h1 className="text-xl font-black tracking-tight">Bolsaldo</h1></div>
          </div>
          <div className="flex items-center gap-1"><button onClick={() => setDarkMode((value) => !value)} className="rounded-xl p-3 text-slate-500 hover:bg-card" aria-label="Cambiar modo oscuro">{darkMode ? <Sun size={19} /> : <Moon size={19} />}</button><button onClick={() => setIsInstallmentFormOpen(true)} className="rounded-xl p-3 text-slate-500 hover:bg-card" aria-label="Agregar compra en cuotas"><FilePlus2 size={19} /></button><button onClick={exportBackup} className="rounded-xl p-3 text-slate-500 hover:bg-card" aria-label="Descargar respaldo Excel"><Download size={20} /></button><button onClick={logout} className="rounded-xl p-3 text-slate-500 hover:bg-card" aria-label="Cerrar sesión"><LogOut size={19} /></button></div>
        </header>

        {syncError && <button onClick={() => setSyncError("")} className="mb-4 w-full rounded-xl bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-800">{syncError} <span className="float-right">×</span></button>}

        <div className="mb-5 flex items-center justify-between rounded-2xl bg-card p-2 shadow-sm ring-1 ring-border">
          <button onClick={() => changeMonth(-1)} className="rounded-xl p-2.5 hover:bg-slate-100" aria-label="Mes anterior"><ChevronLeft size={20} /></button>
          <div className="flex items-center gap-2"><span className="flex items-center gap-2 text-sm font-bold"><CalendarDays size={17} className="text-[#0f766e]" />{months[month]} {year}</span><button onClick={() => setSelectedDate(new Date())} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-black text-[#0f766e]">Hoy</button></div>
          <button onClick={() => changeMonth(1)} className="rounded-xl p-2.5 hover:bg-slate-100" aria-label="Mes siguiente"><ChevronRight size={20} /></button>
        </div>

        {view === "inicio" && <>
          <section className="overflow-hidden rounded-3xl bg-[#12372a] p-6 text-white shadow-xl shadow-emerald-100/80">
            <p className="text-sm font-medium text-slate-300">Balance de {months[month].toLowerCase()}</p>
            <CurrencyLines amounts={balanceByCurrency} empty="Sin movimientos este mes" large />
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
              <div><p className="flex items-center gap-1 text-xs text-emerald-300"><TrendingUp size={14} />Ingresos</p><CurrencyLines amounts={incomeByCurrency} /></div>
              <div><p className="flex items-center gap-1 text-xs text-rose-300"><TrendingDown size={14} />Gastos</p><CurrencyLines amounts={expenseByCurrency} /></div>
            </div>
          </section>

          <button onClick={() => setIsFormOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] py-4 font-bold text-white shadow-lg shadow-emerald-100 active:scale-[.99]"><Plus size={21} />Anotar movimiento</button>

          <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">En qué se fue</h2><span className="text-sm text-slate-400">{monthRows.filter((item) => item.type === "expense").length} registros</span></div>
            <div className="space-y-2">{expensesByCategory.slice(0, 4).map((item) => <CategoryRow key={`${item.category}-${item.currency}`} category={`${item.category} · ${item.currency}`} amount={item.amount} total={expenseByCurrency[item.currency] ?? 0} currency={item.currency} />)}{expensesByCategory.length === 0 && <Empty text="Todavía no anotaste gastos este mes." />}</div>
          </section>

          <Charts movements={monthRows} year={year} month={month} />
          <LastTwelveMonthsChart movements={movements} />

          <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">Últimos movimientos</h2><button onClick={() => setView("movimientos")} className="text-sm font-bold text-[#4763ff]">Ver todos</button></div><MovementList movements={movements.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 5)} onDelete={deleteMovement} compact /></section>
        </>}

        {view === "inicio" && <section className="mt-7"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-extrabold">Cuotas por pagar</h2><button onClick={() => setIsInstallmentFormOpen(true)} className="text-sm font-bold text-[#0f766e]">Agregar</button></div><InstallmentPanel movements={upcomingInstallments} onToggle={toggleInstallmentPayment} /></section>}
        {view === "movimientos" && <section><div className="mb-4"><h2 className="text-xl font-black">Movimientos</h2><p className="text-sm text-slate-500">{months[month]} {year}</p></div><MovementList movements={monthRows.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))} onDelete={deleteMovement} /><button onClick={() => setIsFormOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0f766e] py-4 font-bold text-white"><Plus size={20} />Nuevo movimiento</button></section>}
        {view === "anual" && <YearOverview movements={movements} year={year} />}
        {view === "planilla" && <MixedCurrencySpreadsheetView movements={movements} groups={groups} year={year} />}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-5xl justify-around border-t border-slate-200 bg-white/95 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur"><NavButton active={view === "inicio"} onClick={() => setView("inicio")} icon={<CircleDollarSign size={20} />} text="Inicio" /><NavButton active={view === "movimientos"} onClick={() => setView("movimientos")} icon={<ReceiptText size={20} />} text="Movimientos" /><NavButton active={view === "planilla"} onClick={() => setView("planilla")} icon={<Table2 size={20} />} text="Planilla" /><NavButton active={view === "anual"} onClick={() => setView("anual")} icon={<BarChart3 size={20} />} text="Resumen" /></nav>
      {isFormOpen && <MovementForm groups={groups} categories={categories} onClose={() => setIsFormOpen(false)} onManage={() => setIsCategoryManagerOpen(true)} onSave={addMovement} />}
      {movementToDelete && <DeleteMovementModal movement={movementToDelete} onCancel={() => setMovementToDelete(null)} onConfirm={() => deleteMovement(movementToDelete.id)} />}
      {isInstallmentFormOpen && <InstallmentForm onClose={() => setIsInstallmentFormOpen(false)} onSave={addInstallments} />}
      {isCategoryManagerOpen && <CategoryManager groups={groups} categories={categories} onClose={() => setIsCategoryManagerOpen(false)} onAddGroup={addGroup} onRenameGroup={renameGroup} onDeleteGroup={deleteGroup} onAddCategory={addCategory} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory} />}
      {configLoaded && groups.length > 0 && categories.length === 0 && <CategorySetup onManage={() => setIsCategoryManagerOpen(true)} onUseSuggestions={useSuggestions} />}
    </main>
  )
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (id: string) => Promise<void> }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage("Escribí tu email y después tocá “Olvidé mi contraseña”.")
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset` })
    setBusy(false)
    setMessage(error ? authMessage(error.message) : "Te enviamos un enlace para crear una contraseña nueva.")
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !password) {
      setMessage("Completá tu email y contraseña para continuar.")
      return
    }
    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.")
      return
    }
    setBusy(true)
    setMessage("")
    const result = isCreating ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setMessage(authMessage(result.error.message))
      return
    }
    if (result.data.user && result.data.session) await onAuthenticated(result.data.user.id)
    else setMessage("Revisá tu correo y confirmá la cuenta para ingresar.")
  }
  return <main className="grid min-h-screen place-items-center bg-[#f7faf9] p-5 text-slate-900"><form noValidate onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-emerald-100/70 ring-1 ring-slate-200"><div className="grid size-12 place-items-center rounded-2xl bg-[#0f766e] text-white"><WalletCards size={23} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#0f766e]">Tu espacio personal</p><h1 className="mt-1 text-2xl font-black">{isCreating ? "Empezá a ordenar tu plata" : "Todo lo que gastás, en un solo lugar"}</h1><p className="mt-2 text-sm leading-6 text-slate-500">Anotá gastos al momento, mirá en qué se va tu plata y consultalo igual desde el celular o la compu.</p><div className="mt-5 flex gap-2 text-xs font-semibold text-slate-600"><span className="rounded-full bg-emerald-50 px-3 py-1.5">Simple</span><span className="rounded-full bg-emerald-50 px-3 py-1.5">Privado</span><span className="rounded-full bg-emerald-50 px-3 py-1.5">Siempre a mano</span></div><label className="mt-6 block text-sm font-bold">Tu email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@email.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#0f766e]" /></label><label className="mt-3 block text-sm font-bold">Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Tu contraseña" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>{!isCreating && <button type="button" disabled={busy} onClick={resetPassword} className="mt-2 text-sm font-bold text-[#0f766e]">Olvidé mi contraseña</button>}{message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}<button disabled={busy} className="mt-5 w-full rounded-2xl bg-[#0f766e] py-3.5 font-bold text-white disabled:opacity-60">{busy ? "Un momento…" : isCreating ? "Crear mi cuenta" : "Ingresar"}</button><button type="button" onClick={() => { setIsCreating((value) => !value); setMessage("") }} className="mt-4 w-full text-sm font-bold text-[#0f766e]">{isCreating ? "Ya tengo cuenta" : "Crear mi cuenta"}</button></form></main>
}

function InstallmentForm({ onClose, onSave }: { onClose: () => void; onSave: (title: string, amount: number, count: number, firstDate: string) => Promise<void> }) {
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [count, setCount] = useState("3")
  const [firstDate, setFirstDate] = useState(isoToday())
  const submit = (event: React.FormEvent) => { event.preventDefault(); const parsedAmount = Number(amount.replace(",", ".")); const parsedCount = Number(count); if (!title.trim() || !parsedAmount || !Number.isInteger(parsedCount) || parsedCount < 2) return; onSave(title.trim(), parsedAmount, parsedCount, firstDate) }
  return <div className="fixed inset-0 z-30 flex items-end bg-slate-950/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={submit} className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">Planificar gasto</p><h2 className="text-xl font-black">Compra en cuotas</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Se crearán los vencimientos como gastos fijos en “Cuotas compras”. Los vas marcando como pagados a medida que los abonás.</p><label className="block text-sm font-bold">Compra o detalle<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Ej. Notebook" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-sm font-bold">Valor de cada cuota<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required placeholder="$ 0" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label><label className="text-sm font-bold">Cantidad<input type="number" min="2" max="60" value={count} onChange={(event) => setCount(event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label></div><label className="mt-3 block text-sm font-bold">Primer vencimiento<input type="date" value={firstDate} onChange={(event) => setFirstDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal" /></label><button className="mt-6 w-full rounded-2xl bg-[#0f766e] py-3.5 font-bold text-white">Crear plan de cuotas</button></form></div>
}

function InstallmentPanel({ movements, onToggle }: { movements: Movement[]; onToggle: (id: string, paid: boolean) => Promise<void> }) { if (!movements.length) return <Empty text="No tenés cuotas próximas." />; return <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">{movements.map((movement) => <button key={movement.id} type="button" onClick={() => onToggle(movement.id, !movement.paid)} className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition-all duration-200 last:border-0 ${movement.paid ? "bg-emerald-50/70 opacity-70" : "hover:bg-slate-50 active:scale-[.99]"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition-all duration-200 ${movement.paid ? "border-[#0f766e] bg-[#0f766e] text-white scale-100" : "border-slate-300 bg-white text-transparent"}`}>✓</span><div className="min-w-0 flex-1"><p className={`truncate font-bold ${movement.paid ? "line-through text-slate-500" : ""}`}>{movement.note}</p><p className="text-xs text-slate-400">Cuota {movement.installmentNumber}/{movement.installmentTotal} · {new Date(`${movement.date}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</p></div><div className="text-right"><p className="text-sm font-extrabold tabular-nums">{formatMoney(movement.amount, movement.currency ?? "ARS")}</p><p className={`mt-1 text-[10px] font-black uppercase tracking-wide ${movement.paid ? "text-[#0f766e]" : "text-slate-400"}`}>{movement.paid ? "Pagada" : "Pendiente"}</p></div></button>)}</div> }

function MovementForm({ groups, categories, movement, onClose, onManage, onSave }: { groups: FinanceGroupConfig[]; categories: FinanceCategoryConfig[]; movement?: Movement; onClose: () => void; onManage: () => void; onSave: (movement: Omit<Movement, "id" | "createdAt" | "attachmentPath">, attachment: File | null) => void }) {
  const [type, setType] = useState<Movement["type"]>(movement?.type ?? "expense")
  const [groupId, setGroupId] = useState(() => groups.find((group) => group.name === movement?.group)?.id ?? "")
  const [categoryId, setCategoryId] = useState(() => categories.find((category) => category.name === movement?.category && category.groupId === groups.find((group) => group.name === movement?.group)?.id)?.id ?? "")
  const [amount, setAmount] = useState(movement ? String(movement.amount) : "")
  const [date, setDate] = useState(movement?.date ?? isoToday())
  const [note, setNote] = useState(movement?.note ?? "")
  const [currency, setCurrency] = useState<Currency>(movement?.currency ?? "ARS")
  const [attachment, setAttachment] = useState<File | null>(null)
  const availableGroups = groups.filter((group) => group.type === type)
  const selectedGroup = availableGroups.find((group) => group.id === groupId) ?? availableGroups[0]
  const availableCategories = categories.filter((category) => category.groupId === selectedGroup?.id)
  const selectedCategory = availableCategories.find((category) => category.id === categoryId) ?? availableCategories[0]
  useEffect(() => setGroupId(availableGroups[0]?.id ?? ""), [type, groups])
  useEffect(() => setCategoryId(availableCategories[0]?.id ?? ""), [groupId, categories])
  const submit = (event: React.FormEvent) => { event.preventDefault(); const parsed = Number(amount.replace(",", ".")); if (!parsed || parsed < 0 || !selectedGroup || !selectedCategory) return; onSave({ type, group: selectedGroup.name, category: selectedCategory.name, amount: parsed, date, note: note.trim() || "Sin detalle", currency }, attachment) }
  return <div className="fixed inset-0 z-30 flex items-end bg-slate-950/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">Carga rápida</p><h2 className="text-xl font-black">{movement ? "Editar movimiento" : "Nuevo movimiento"}</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setType("expense")} className={`rounded-lg py-2.5 text-sm font-bold ${type === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>Gasto</button><button type="button" onClick={() => setType("income")} className={`rounded-lg py-2.5 text-sm font-bold ${type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Ingreso</button></div><label className="mt-4 block text-sm font-bold">Monto<input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="$ 0" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xl font-bold outline-none focus:border-[#0f766e]" /></label><label className="mt-3 block text-sm font-bold">Divisa<select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium">{Object.entries(currencyLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><label className="mt-3 block text-sm font-bold">{type === "income" ? "Tipo de ingreso" : "Tipo de gasto"}<select value={selectedGroup?.id ?? ""} onChange={(event) => setGroupId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium">{availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="mt-3 flex items-center justify-between"><label className="text-sm font-bold">Categoría</label><button type="button" onClick={onManage} className="text-xs font-bold text-[#0f766e]">Administrar</button></div>{availableCategories.length ? <select value={selectedCategory?.id ?? ""} onChange={(event) => setCategoryId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium">{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : <button type="button" onClick={onManage} className="mt-1 w-full rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-left text-sm font-semibold text-amber-800">Creá una categoría para poder guardar este movimiento.</button>}<label className="mt-3 block text-sm font-bold">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium" /></label><label className="mt-3 block text-sm font-bold">Detalle <span className="font-normal text-slate-400">(opcional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej. cena con amigos" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium" /></label><label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-bold text-slate-600"><ImagePlus size={18} />{attachment ? attachment.name : movement?.attachmentPath ? "Cambiar foto del comprobante" : "Adjuntar foto del comprobante (opcional)"}<input type="file" accept="image/*" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /></label><button disabled={!selectedGroup || !selectedCategory} className="mt-6 w-full rounded-2xl bg-[#0f766e] py-3.5 font-bold text-white disabled:opacity-50">Guardar movimiento</button></form></div>
  return <div className="fixed inset-0 z-30 flex items-end bg-slate-950/40 sm:items-center sm:justify-center sm:p-6"><form onSubmit={submit} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">Carga rápida</p><h2 className="text-xl font-black">Nuevo movimiento</h2></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setType("expense")} className={`rounded-lg py-2.5 text-sm font-bold ${type === "expense" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>Gasto</button><button type="button" onClick={() => setType("income")} className={`rounded-lg py-2.5 text-sm font-bold ${type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Ingreso</button></div><label className="mt-4 block text-sm font-bold">Monto<input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="$ 0" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-xl font-bold outline-none focus:border-[#0f766e]" /></label><label className="mt-3 block text-sm font-bold">{type === "income" ? "Tipo de ingreso" : "Tipo de gasto"}<select value={selectedGroup?.id ?? ""} onChange={(event) => setGroupId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium">{availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><div className="mt-3 flex items-center justify-between"><label className="text-sm font-bold">Categoría</label><button type="button" onClick={onManage} className="text-xs font-bold text-[#0f766e]">Administrar</button></div>{availableCategories.length ? <select value={selectedCategory?.id ?? ""} onChange={(event) => setCategoryId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium">{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : <button type="button" onClick={onManage} className="mt-1 w-full rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-left text-sm font-semibold text-amber-800">Creá una categoría para poder guardar este movimiento.</button>}<label className="mt-3 block text-sm font-bold">Fecha<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-medium" /></label><label className="mt-3 block text-sm font-bold">Detalle <span className="font-normal text-slate-400">(opcional)</span><input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej. cena con amigos" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 font-medium" /></label><button disabled={!selectedGroup || !selectedCategory} className="mt-6 w-full rounded-2xl bg-[#0f766e] py-3.5 font-bold text-white disabled:opacity-50">Guardar movimiento</button></form></div>
}

function CategorySetup({ onManage, onUseSuggestions }: { onManage: () => void; onUseSuggestions: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  const useSuggestions = async () => { setBusy(true); await onUseSuggestions(); setBusy(false) }
  return <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 p-5"><section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#0f766e]"><Target size={24} /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">Primer paso</p><h2 className="mt-1 text-2xl font-black">Configurá tus categorías</h2><p className="mt-2 text-sm leading-6 text-slate-500">Tu cuenta empieza limpia. Elegí sugerencias comunes o creá las categorías que realmente usás.</p><button disabled={busy} onClick={useSuggestions} className="mt-5 w-full rounded-2xl bg-[#0f766e] py-3.5 font-bold text-white disabled:opacity-60">{busy ? "Agregando sugerencias…" : "Usar sugerencias"}</button><button onClick={onManage} className="mt-3 w-full rounded-2xl border border-slate-200 py-3.5 font-bold text-slate-700">Crear mis categorías</button></section></div>
}

function CategoryManager({ groups, categories, onClose, onAddGroup, onRenameGroup, onDeleteGroup, onAddCategory, onRenameCategory, onDeleteCategory }: { groups: FinanceGroupConfig[]; categories: FinanceCategoryConfig[]; onClose: () => void; onAddGroup: (name: string, type: Movement["type"]) => Promise<void>; onRenameGroup: (group: FinanceGroupConfig, name: string) => Promise<void>; onDeleteGroup: (group: FinanceGroupConfig) => Promise<void>; onAddCategory: (groupId: string, name: string) => Promise<void>; onRenameCategory: (category: FinanceCategoryConfig, name: string) => Promise<void>; onDeleteCategory: (category: FinanceCategoryConfig) => Promise<void> }) {
  const ask = (message: string, current = "") => window.prompt(message, current)?.trim()
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupType, setNewGroupType] = useState<Movement["type"]>("expense")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center sm:p-6"><section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">Personalizá tu registro</p><h2 className="text-xl font-black">Administrar categorías</h2></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><form onSubmit={async (event) => { event.preventDefault(); if (!newGroupName.trim()) return; await onAddGroup(newGroupName, newGroupType); setNewGroupName("") }} className="mt-5 grid grid-cols-[1fr_auto_auto] gap-2"><input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="Nuevo tipo" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><select value={newGroupType} onChange={(event) => setNewGroupType(event.target.value as Movement["type"])} className="rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="expense">Gasto</option><option value="income">Ingreso</option></select><button className="rounded-xl bg-[#0f766e] px-3 text-sm font-bold text-white">Agregar</button></form><form onSubmit={async (event) => { event.preventDefault(); if (!selectedGroupId || !newCategoryName.trim()) return; await onAddCategory(selectedGroupId, newCategoryName); setNewCategoryName("") }} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2"><select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-2 text-sm"><option value="">Tipo para categoría</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select><input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nueva categoría" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" /><button className="rounded-xl bg-[#0f766e] px-3 text-sm font-bold text-white">Agregar</button></form><div className="mt-5 space-y-4">{groups.map((group) => <GroupEditor key={group.id} group={group} categories={categories.filter((category) => category.groupId === group.id)} onRenameGroup={onRenameGroup} onDeleteGroup={onDeleteGroup} onRenameCategory={onRenameCategory} onDeleteCategory={onDeleteCategory} />)}</div></section></div>
  const addGroup = async (type: Movement["type"]) => { const name = ask(type === "income" ? "Nombre del tipo de ingreso" : "Nombre del tipo de gasto"); if (name) await onAddGroup(name, type) }
  return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 sm:items-center sm:justify-center sm:p-6"><section className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0f766e]">Personalizá tu registro</p><h2 className="text-xl font-black">Administrar categorías</h2><p className="mt-1 text-sm text-slate-500">Cambios disponibles desde todos tus dispositivos.</p></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div><div className="mt-5 flex gap-2"><button onClick={() => addGroup("expense")} className="flex-1 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700">+ Tipo de gasto</button><button onClick={() => addGroup("income")} className="flex-1 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">+ Tipo de ingreso</button></div><div className="mt-5 space-y-4">{groups.map((group) => <div key={group.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black">{group.name}</p><p className="text-xs text-slate-400">{group.type === "income" ? "Ingreso" : "Gasto"}</p></div><div className="flex gap-1"><button onClick={async () => { const name = ask("Nuevo nombre", group.name); if (name) await onRenameGroup(group, name) }} className="rounded-lg px-2 py-1 text-xs font-bold text-[#0f766e]">Renombrar</button><button onClick={async () => { if (window.confirm(`¿Borrar “${group.name}”? Los movimientos anteriores se conservan.`)) await onDeleteGroup(group) }} className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600">Borrar</button></div></div><div className="mt-3 flex flex-wrap gap-2">{categories.filter((category) => category.groupId === group.id).map((category) => <span key={category.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium"><span>{category.name}</span><button aria-label={`Renombrar ${category.name}`} onClick={async () => { const name = ask("Nuevo nombre", category.name); if (name) await onRenameCategory(category, name) }} className="text-[#0f766e]">·</button><button aria-label={`Borrar ${category.name}`} onClick={() => onDeleteCategory(category)} className="text-rose-500">×</button></span>)}<button onClick={async () => { const name = ask("Nueva categoría"); if (name) await onAddCategory(group.id, name) }} className="rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-500">+ Categoría</button></div></div>)}</div></section></div>
}

function GroupEditor({ group, categories, onRenameGroup, onDeleteGroup, onRenameCategory, onDeleteCategory }: { group: FinanceGroupConfig; categories: FinanceCategoryConfig[]; onRenameGroup: (group: FinanceGroupConfig, name: string) => Promise<void>; onDeleteGroup: (group: FinanceGroupConfig) => Promise<void>; onRenameCategory: (category: FinanceCategoryConfig, name: string) => Promise<void>; onDeleteCategory: (category: FinanceCategoryConfig) => Promise<void> }) { const [groupName, setGroupName] = useState(group.name); const [confirmDelete, setConfirmDelete] = useState(false); return <div className="rounded-2xl border border-slate-200 p-4"><div className="flex gap-2"><input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold" /><button onClick={() => onRenameGroup(group, groupName)} className="rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700">Guardar</button><button onClick={() => setConfirmDelete(true)} className="rounded-xl bg-rose-50 px-3 text-rose-600"><Trash2 size={16} /></button></div><div className="mt-3 space-y-2">{categories.map((category) => <CategoryEditor key={category.id} category={category} onRename={onRenameCategory} onDelete={onDeleteCategory} />)}</div>{confirmDelete && <div className="mt-3 rounded-2xl bg-rose-50 p-3"><p className="text-sm font-bold text-rose-800">¿Borrar “{group.name}” y sus categorías?</p><p className="mt-1 text-xs text-rose-700">Los movimientos anteriores se conservan.</p><div className="mt-3 flex gap-2"><button onClick={() => setConfirmDelete(false)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold">Cancelar</button><button onClick={() => onDeleteGroup(group)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Borrar tipo</button></div></div>}</div> }
function CategoryEditor({ category, onRename, onDelete }: { category: FinanceCategoryConfig; onRename: (category: FinanceCategoryConfig, name: string) => Promise<void>; onDelete: (category: FinanceCategoryConfig) => Promise<void> }) { const [name, setName] = useState(category.name); const [confirmDelete, setConfirmDelete] = useState(false); return <div className="flex items-center gap-2"><input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /><button onClick={() => onRename(category, name)} className="text-xs font-bold text-[#0f766e]">Guardar</button><button onClick={() => setConfirmDelete(true)} className="text-rose-500"><Trash2 size={15} /></button>{confirmDelete && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-5"><div className="w-full max-w-xs rounded-2xl bg-card p-5 text-center"><div className="mx-auto grid size-11 place-items-center rounded-2xl bg-rose-100 text-rose-600"><Trash2 size={20} /></div><p className="mt-3 font-black">¿Borrar categoría?</p><p className="mt-1 text-sm text-slate-500">No borra tus movimientos anteriores.</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={() => setConfirmDelete(false)} className="rounded-xl border border-slate-200 py-2.5 text-sm font-bold">Cancelar</button><button onClick={() => onDelete(category)} className="rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white">Borrar</button></div></div></div>}</div> }
function DeleteMovementModal({ movement, onCancel, onConfirm }: { movement: Movement; onCancel: () => void; onConfirm: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-5"><section role="dialog" aria-modal="true" aria-labelledby="delete-movement-title" className="w-full max-w-sm rounded-3xl bg-card p-6 text-center shadow-2xl"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-rose-100 text-rose-600"><Trash2 size={29} /></div><p className="mt-5 text-xs font-black uppercase tracking-[0.14em] text-rose-600">Eliminar movimiento</p><h2 id="delete-movement-title" className="mt-1 text-xl font-black">¿Querés borrar este registro?</h2><p className="mt-3 text-sm leading-6 text-slate-500"><strong className="text-slate-800">{movement.category}</strong> · {formatMoney(movement.amount, movement.currency ?? "ARS")}. Esta acción no se puede deshacer.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={onCancel} className="rounded-2xl border border-slate-200 py-3 font-bold text-slate-700">Cancelar</button><button onClick={onConfirm} className="rounded-2xl bg-rose-600 py-3 font-bold text-white">Sí, eliminar</button></div></section></div> }

function MovementList({ movements, onDelete, compact = false }: { movements: Movement[]; onDelete: (id: string) => void; compact?: boolean }) { if (!movements.length) return <Empty text="No hay movimientos para mostrar." />; return <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">{movements.map((item) => <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-0"><div className={`grid size-10 shrink-0 place-items-center rounded-xl ${item.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>{item.type === "income" ? <TrendingUp size={19} /> : <TrendingDown size={19} />}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{item.category}</p><p className="truncate text-xs text-slate-400">{new Date(`${item.date}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} · {item.note}</p></div><div className="flex items-center gap-1"><p className={`whitespace-nowrap text-sm font-extrabold ${item.type === "income" ? "text-emerald-600" : "text-slate-800"}`}>{item.type === "income" ? "+" : "-"}{money.format(item.amount)}</p>{!compact && <button onClick={() => onDelete(item.id)} className="ml-1 rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Eliminar movimiento"><Trash2 size={16} /></button>}</div></div>)}</div> }
function CategoryRow({ category, amount, total }: { category: string; amount: number; total: number }) { const percent = total ? Math.round(amount / total * 100) : 0; return <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/70"><div className="flex justify-between gap-3"><p className="font-bold">{category}</p><p className="font-bold tabular-nums">{money.format(amount)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ff8a65]" style={{ width: `${Math.max(percent, 3)}%` }} /></div><p className="mt-1.5 text-xs text-slate-400">{percent}% de tus gastos del mes</p></div> }
function YearOverview({ movements, year }: { movements: Movement[]; year: number }) { const data = months.map((name, month) => movements.filter((item) => { const date = new Date(`${item.date}T12:00:00`); return date.getFullYear() === year && date.getMonth() === month }).reduce((acc, item) => ({ income: acc.income + (item.type === "income" ? item.amount : 0), expense: acc.expense + (item.type === "expense" ? item.amount : 0) }), { income: 0, expense: 0 })); const annual = data.reduce((acc, item) => ({ income: acc.income + item.income, expense: acc.expense + item.expense }), { income: 0, expense: 0 }); return <section><div className="mb-5"><p className="text-sm font-bold text-[#4763ff]">Vista anual</p><h2 className="text-2xl font-black">Resumen {year}</h2></div><div className="grid grid-cols-2 gap-3"><SummaryCard label="Ingresos" value={annual.income} icon={<TrendingUp size={18} />} tone="emerald" /><SummaryCard label="Gastos" value={annual.expense} icon={<TrendingDown size={18} />} tone="rose" /></div><div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">{data.map((item, index) => <div key={months[index]} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-100 p-4 text-sm last:border-0"><p className="font-bold">{months[index]}</p><p className="text-emerald-600">+{money.format(item.income)}</p><p className="text-rose-500">-{money.format(item.expense)}</p></div>)}</div></section> }
function mixedCurrencyText(items: Movement[]) { const totals = amountsByCurrency(items); const entries = Object.entries(totals); return entries.length ? entries.map(([currency, amount]) => formatMoney(amount, currency as Currency)).join(" + ") : "—" }
function MixedCurrencySpreadsheetView({ movements, groups, year }: { movements: Movement[]; groups: FinanceGroupConfig[]; year: number }) { const visibleGroups = groups.length ? groups : [...new Map(movements.map((movement) => [movement.group, { id: movement.group, name: movement.group, type: movement.type }])).values()]; return <section><div className="mb-5"><p className="text-sm font-bold text-[#0f766e]">Vista tipo Excel</p><h2 className="text-2xl font-black">Planilla {year}</h2><p className="mt-1 text-sm text-slate-500">Cada importe se agrupa por divisa: ARS, USD, EUR y BRL no se mezclan.</p></div>{visibleGroups.map((group) => { const relevant = movements.filter((movement) => movement.group === group.name && movement.type === group.type && movement.date.startsWith(`${year}-`)); const categoryNames = [...new Set(relevant.map((movement) => movement.category))].sort((a, b) => a.localeCompare(b, "es")); if (!categoryNames.length) return null; return <section key={group.id} className="mb-7 overflow-hidden rounded-2xl bg-card ring-1 ring-border"><div className={`px-4 py-3 text-sm font-black ${group.type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{group.name}</div><div className="overflow-x-auto"><table className="min-w-[1050px] border-collapse text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="sticky left-0 z-10 min-w-40 bg-slate-50 px-4 py-3 text-left font-bold">Categoría</th>{months.map((name) => <th key={name} className="min-w-24 px-2 py-3 font-bold">{name.slice(0, 3)}</th>)}<th className="min-w-32 px-4 py-3 font-black">Total</th></tr></thead><tbody>{categoryNames.map((category) => { const categoryMovements = relevant.filter((movement) => movement.category === category); return <tr key={category} className="border-t border-slate-100"><th className="sticky left-0 z-10 bg-card px-4 py-3 text-left font-bold">{category}</th>{months.map((_, month) => <td key={month} className="px-2 py-3 leading-5 text-slate-600">{mixedCurrencyText(categoryMovements.filter((movement) => new Date(`${movement.date}T12:00:00`).getMonth() === month))}</td>)}<td className="bg-slate-50 px-4 py-3 font-extrabold leading-5">{mixedCurrencyText(categoryMovements)}</td></tr> })}</tbody><tfoot className="border-t-2 border-slate-200 bg-slate-100"><tr><th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left font-black">Total</th>{months.map((_, month) => <td key={month} className="px-2 py-3 font-black leading-5">{mixedCurrencyText(relevant.filter((movement) => new Date(`${movement.date}T12:00:00`).getMonth() === month))}</td>)}<td className="px-4 py-3 font-black leading-5">{mixedCurrencyText(relevant)}</td></tr></tfoot></table></div></section> })}</section> }
function SpreadsheetView({ movements, groups, year }: { movements: Movement[]; groups: FinanceGroupConfig[]; year: number }) { const visibleGroups = groups.length ? groups : [...new Map(movements.map((movement) => [movement.group, { id: movement.group, name: movement.group, type: movement.type }])).values()]; return <section><div className="mb-5"><p className="text-sm font-bold text-[#0f766e]">Vista tipo Excel</p><h2 className="text-2xl font-black">Planilla {year}</h2><p className="mt-1 text-sm text-slate-500">Deslizá horizontalmente para ver todos los meses.</p></div>{visibleGroups.map((group) => <SpreadsheetSection key={group.id} title={group.name} type={group.type} group={group.name} movements={movements} year={year} />)}</section> }
function SpreadsheetSection({ title, type, group, movements, year }: { title: string; type: Movement["type"]; group: string; movements: Movement[]; year: number }) { const rows = useMemo(() => { const relevant = movements.filter((item) => { const date = new Date(`${item.date}T12:00:00`); return item.type === type && item.group === group && date.getFullYear() === year }); const categoryNames = [...new Set(relevant.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "es")); return categoryNames.map((category) => { const values = months.map((_, month) => relevant.filter((item) => item.category === category && new Date(`${item.date}T12:00:00`).getMonth() === month).reduce((sum, item) => sum + item.amount, 0)); return { category, values, total: values.reduce((sum, value) => sum + value, 0) } }) }, [group, movements, type, year]); if (!rows.length) return null; const monthlyTotals = months.map((_, month) => rows.reduce((sum, row) => sum + row.values[month], 0)); return <section className="mb-7 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70"><div className={`px-4 py-3 text-sm font-black ${type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{title}</div><div className="overflow-x-auto"><table className="min-w-[940px] border-collapse text-right text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="sticky left-0 z-10 min-w-40 bg-slate-50 px-4 py-3 text-left font-bold">Categoría</th>{months.map((month) => <th key={month} className="min-w-20 px-2 py-3 font-bold">{month.slice(0, 3)}</th>)}<th className="min-w-24 px-4 py-3 font-black">Total</th></tr></thead><tbody>{rows.map((row) => <tr key={row.category} className="border-t border-slate-100"><th className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-bold text-slate-700">{row.category}</th>{row.values.map((value, index) => <td key={index} className="px-2 py-3 tabular-nums text-slate-600">{value ? money.format(value) : "—"}</td>)}<td className="bg-slate-50 px-4 py-3 font-extrabold tabular-nums text-slate-900">{money.format(row.total)}</td></tr>)}</tbody><tfoot className="border-t-2 border-slate-200 bg-slate-100"><tr><th className="sticky left-0 z-10 bg-slate-100 px-4 py-3 text-left font-black">Total</th>{monthlyTotals.map((total, index) => <td key={index} className="px-2 py-3 font-black tabular-nums">{total ? money.format(total) : "—"}</td>)}<td className="px-4 py-3 font-black tabular-nums">{money.format(monthlyTotals.reduce((sum, total) => sum + total, 0))}</td></tr></tfoot></table></div></section> }
function SummaryCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: "emerald" | "rose" }) { return <div className={`rounded-2xl p-4 ${tone === "emerald" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}><p className="flex items-center gap-1 text-xs font-bold">{icon}{label}</p><p className="mt-2 text-lg font-black">{money.format(value)}</p></div> }
function NavButton({ active, onClick, icon, text }: { active: boolean; onClick: () => void; icon: React.ReactNode; text: string }) { return <button onClick={onClick} className={`flex min-w-20 flex-col items-center gap-1 rounded-xl px-4 py-1 text-xs font-bold ${active ? "text-[#4763ff]" : "text-slate-400"}`}>{icon}{text}</button> }
function CurrencyLines({ amounts, empty, large = false }: { amounts: Record<string, number>; empty?: string; large?: boolean }) { const values = Object.entries(amounts); if (!values.length) return <p className={large ? "mt-2 text-2xl font-black" : "mt-1 text-sm font-bold"}>{empty ?? "—"}</p>; return <div className={large ? "mt-2 space-y-1 text-3xl font-black tracking-tight" : "mt-1 space-y-0.5 text-sm font-bold"}>{values.map(([currency, value]) => <p key={currency}>{formatMoney(value, currency as Currency)}</p>)}</div> }
function LastTwelveMonthsChart({ movements }: { movements: Movement[] }) { const reference = new Date(); const data = Array.from({ length: 12 }, (_, index) => { const date = new Date(reference.getFullYear(), reference.getMonth() - 11 + index, 1); const value = movements.filter((movement) => { const movementDate = new Date(`${movement.date}T12:00:00`); return movement.type === "expense" && (movement.currency ?? "ARS") === "ARS" && movementDate.getFullYear() === date.getFullYear() && movementDate.getMonth() === date.getMonth() }).reduce((sum, movement) => sum + movement.amount, 0); return { id: `${date.getFullYear()}-${date.getMonth()}`, label: `${months[date.getMonth()].slice(0, 1)}${String(date.getFullYear()).slice(2)}`, value } }); const maximum = Math.max(...data.map((item) => item.value), 1); return <section className="mt-4 rounded-2xl bg-card p-4 ring-1 ring-border"><h2 className="font-extrabold">Últimos 12 meses</h2><p className="mt-1 text-xs text-muted-foreground">Gastos mensuales en ARS, incluyendo el año anterior</p><div className="mt-4 flex h-32 items-end gap-1.5">{data.map((item) => <div key={item.id} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1"><div title={`${item.label}: ${formatMoney(item.value)}`} className="w-full rounded-t bg-[#0f766e]" style={{ height: `${Math.max(item.value ? item.value / maximum * 100 : 2, 2)}%`, opacity: item.value ? 1 : 0.25 }} /><span className="text-center text-[9px] text-muted-foreground">{item.label}</span></div>)}</div></section> }
function Charts({ movements, year, month }: { movements: Movement[]; year: number; month: number }) { const expenses = movements.filter((movement) => movement.type === "expense" && (movement.currency ?? "ARS") === "ARS"); const byCategory = Object.entries(expenses.reduce<Record<string, number>>((result, movement) => { result[movement.category] = (result[movement.category] ?? 0) + movement.amount; return result }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5); const maximum = byCategory[0]?.[1] ?? 1; const monthly = months.map((_, index) => movements.filter((movement) => movement.type === "expense" && (movement.currency ?? "ARS") === "ARS" && new Date(`${movement.date}T12:00:00`).getFullYear() === year && new Date(`${movement.date}T12:00:00`).getMonth() === index).reduce((sum, movement) => sum + movement.amount, 0)); const monthlyMaximum = Math.max(...monthly, 1); return <section className="mt-7 grid gap-4 lg:grid-cols-2"><div className="rounded-2xl bg-card p-4 ring-1 ring-border"><h2 className="font-extrabold">Gastos por categoría</h2><p className="mt-1 text-xs text-muted-foreground">ARS del mes seleccionado</p><div className="mt-4 space-y-3">{byCategory.length ? byCategory.map(([name, value]) => <div key={name}><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-bold">{name}</span><span>{formatMoney(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${value / maximum * 100}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">Todavía no hay gastos en ARS.</p>}</div></div><div className="rounded-2xl bg-card p-4 ring-1 ring-border"><h2 className="font-extrabold">Evolución anual</h2><p className="mt-1 text-xs text-muted-foreground">Gastos mensuales en ARS</p><div className="mt-4 flex h-28 items-end gap-1.5">{monthly.map((value, index) => <div key={months[index]} className="flex min-w-0 flex-1 flex-col items-center gap-1"><div title={`${months[index]}: ${formatMoney(value)}`} className={`w-full rounded-t bg-[#0f766e] ${index === month ? "opacity-100" : "opacity-45"}`} style={{ height: `${Math.max(value ? value / monthlyMaximum * 100 : 2, 2)}%` }} /><span className="text-[9px] text-muted-foreground">{months[index].slice(0, 1)}</span></div>)}</div></div></section> }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400"><Target className="mx-auto mb-2 text-slate-300" size={22} />{text}</div> }