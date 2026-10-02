export default function Icon({ name, filled = false }: { name: string; filled?: boolean }) {
  return (
    <span
      className="material-symbols-rounded app-icon"
      aria-hidden="true"
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 420, 'GRAD' 0, 'opsz' 20` }}
    >
      {name}
    </span>
  )
}