import type { ReactNode } from 'react'

export function RadioAction({
  label,
  checked,
  onSelect,
}: {
  label: string
  checked: boolean
  onSelect: () => void
}) {
  return (
    <label className={`radio-action ${checked ? 'is-checked' : ''}`}>
      <input type="radio" checked={checked} onChange={onSelect} />
      <span>{label}</span>
    </label>
  )
}

export function SystemSwitch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="system-switch">
      <span>{label}</span>
      <span className="switch-control">
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <i />
      </span>
    </label>
  )
}

export function PanelSection({
  title,
  open,
  onToggle,
  icon,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="property-section">
      <button className="property-heading" onClick={onToggle}>
        <span className="material-symbols-rounded app-icon">{open ? 'expand_more' : 'chevron_right'}</span>
        {icon}
        {title}
      </button>
      {open && <div className="property-body">{children}</div>}
    </section>
  )
}