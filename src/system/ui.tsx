import { cloneElement, useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react'
import Icon from '../components/Icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'tool' | 'danger'; icon?: string
}
export function Button({ tone = 'secondary', icon, children, className = '', ...rest }: ButtonProps) {
  return <button type="button" className={'sys-button sys-' + tone + ' ' + className} {...rest}>
    {icon && <Icon name={icon} />}{children}
  </button>
}
export function Field({ label, children, help }: { label: string; children: ReactElement<{ id?: string; 'aria-describedby'?: string }>; help?: string }) {
  const generated = useId()
  const id = children.props.id ?? generated
  return <div className="sys-field"><label htmlFor={id}>{label}</label>{cloneElement(children, {
    id, 'aria-describedby': help ? id + '-help' : children.props['aria-describedby'],
  })}{help && <small id={id + '-help'}>{help}</small>}</div>
}
export function Panel({ title, actions, children, className = '' }: { title: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={'sys-panel ' + className}><header className="editor-header"><span>{title}</span><div className="sys-actions">{actions}</div></header><div className="sys-panel-body">{children}</div></section>
}
export function Empty({ icon = 'inventory_2', title, children, action }: { icon?: string; title: string; children: ReactNode; action?: ReactNode }) {
  return <div className="sys-empty"><Icon name={icon} /><h3>{title}</h3><p>{children}</p>{action}</div>
}
export function Errors({ messages }: { messages: string[] }) {
  return messages.length ? <div className="sys-errors" role="alert">{messages.map((message, i) => <p key={i}>{message}</p>)}</div> : null
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={'sys-badge ' + tone}>{children}</span>
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal(); return () => { dialog.current?.close() } }, [])
  return <dialog ref={dialog} className={'sys-dialog ' + (wide ? 'wide' : '')} onCancel={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="sys-dialog-content"><header><h2>{title}</h2><Button tone="tool" icon="close" aria-label="Close dialog" onClick={onClose} /></header>{children}</div>
  </dialog>
}
export function dateLabel(value: number) { return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) }
