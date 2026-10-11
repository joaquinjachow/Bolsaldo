"use client"

import { useState } from "react"
import { WalletCards } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < 6) return setMessage("La contraseña debe tener al menos 6 caracteres.")
    if (password !== confirmPassword) return setMessage("Las contraseñas no coinciden.")
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)
    setMessage(error ? "El enlace venció o no es válido. Pedí uno nuevo." : "Contraseña actualizada. Ya podés volver a ingresar.")
  }

  return <main className="grid min-h-screen place-items-center bg-[#f7faf9] p-5 text-slate-900"><form noValidate onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl shadow-emerald-100/70 ring-1 ring-slate-200"><div className="grid size-12 place-items-center rounded-2xl bg-[#0f766e] text-white"><WalletCards size={23} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-[#0f766e]">Recuperar acceso</p><h1 className="mt-1 text-2xl font-black">Elegí una contraseña nueva</h1><p className="mt-2 text-sm text-slate-500">Usá al menos 6 caracteres y guardala en un lugar seguro.</p><label className="mt-6 block text-sm font-bold">Nueva contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#0f766e]" /></label><label className="mt-3 block text-sm font-bold">Repetí la contraseña<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>{message && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{message}</p>}<button disabled={saving} className="mt-5 w-full rounded-2xl bg-[#0f766e] py-3.5 font-bold text-white disabled:opacity-60">{saving ? "Guardando…" : "Actualizar contraseña"}</button></form></main>
}
