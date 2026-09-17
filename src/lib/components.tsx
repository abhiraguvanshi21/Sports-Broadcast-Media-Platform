import type { FC, Child } from 'hono/jsx'
import { statusClass, statusLabel } from './utils'

export const Chip: FC<{ status?: string | null; label?: string }> = ({ status, label }) => (
  <span class={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${statusClass(status)}`}>
    {status === 'live' && <i class="fas fa-circle text-[6px] live-dot"></i>}
    {label || statusLabel(status)}
  </span>
)

export const Card: FC<{ children?: any; class?: string }> = ({ children, class: cls }) => (
  <div class={`bg-white rounded-2xl border border-slate-200 shadow-sm ${cls || ''}`}>{children}</div>
)

export const SectionTitle: FC<{ eyebrow?: string; title: string; subtitle?: string; light?: boolean; center?: boolean }> = ({
  eyebrow,
  title,
  subtitle,
  light,
  center,
}) => (
  <div class={center ? 'text-center max-w-2xl mx-auto' : ''}>
    {eyebrow && <div class="text-red-500 font-semibold tracking-widest text-xs uppercase mb-3">{eyebrow}</div>}
    <h2 class={`text-2xl sm:text-3xl font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>{title}</h2>
    {subtitle && <p class={`mt-3 ${light ? 'text-slate-400' : 'text-slate-600'}`}>{subtitle}</p>}
  </div>
)

export const Stat: FC<{ label: string; value: any; icon?: string; tone?: string; sub?: string }> = ({
  label,
  value,
  icon,
  tone = 'bg-red-50 text-red-600',
  sub,
}) => (
  <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
    <div class="flex items-start justify-between">
      <div>
        <div class="text-sm text-slate-500 font-medium">{label}</div>
        <div class="text-3xl font-extrabold text-slate-900 mt-1">{value}</div>
        {sub && <div class="text-xs text-slate-400 mt-1">{sub}</div>}
      </div>
      {icon && (
        <span class={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${tone}`}>
          <i class={icon}></i>
        </span>
      )}
    </div>
  </div>
)

export const Empty: FC<{ icon?: string; title: string; text?: string }> = ({ icon = 'fa-inbox', title, text }) => (
  <div class="text-center py-14 px-4">
    <div class="w-16 h-16 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-2xl mb-4">
      <i class={`fas ${icon}`}></i>
    </div>
    <div class="font-semibold text-slate-700">{title}</div>
    {text && <div class="text-sm text-slate-500 mt-1">{text}</div>}
  </div>
)

export const Field: FC<{ label: string; children: any; hint?: string; required?: boolean }> = ({ label, children, hint, required }) => (
  <label class="block">
    <span class="block text-sm font-medium text-slate-700 mb-1.5">
      {label} {required && <span class="text-red-500">*</span>}
    </span>
    {children}
    {hint && <span class="block text-xs text-slate-400 mt-1">{hint}</span>}
  </label>
)

export const inputCls =
  'w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition'
export const selectCls = inputCls
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-semibold shadow-sm hover:brightness-110 active:scale-[.99] transition'
export const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition'
export const btnDanger =
  'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition'

export const THead: FC<{ cols: string[] }> = ({ cols }) => (
  <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
    <tr>
      {cols.map((c) => (
        <th class="text-left font-semibold px-4 py-3 whitespace-nowrap">{c}</th>
      ))}
    </tr>
  </thead>
)

export const Table: FC<{ cols: string[]; children?: any }> = ({ cols, children }) => (
  <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table class="w-full text-sm">
      <THead cols={cols} />
      <tbody class="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
)
