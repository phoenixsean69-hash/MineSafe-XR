import type { ReactNode } from 'react'
import Icon from './Icon'

export function ObservationControl({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`radio-action ${checked ? 'is-checked' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
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
      <button className="property-heading" aria-expanded={open} onClick={onToggle}>
        <Icon name={open ? 'expand_more' : 'chevron_right'} />
        {icon}
        {title}
      </button>
      {open && <div className="property-body">{children}</div>}
    </section>
  )
}
