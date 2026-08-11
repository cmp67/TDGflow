'use client'

/* Switch deslizante — padrão Bemgsy pra qualquer liga/desliga booleano.
   Verde ligado / vermelho desligado é feedback semântico de estado, não
   identidade de marca — nunca navy/gold aqui. */
interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export default function Toggle({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: 38, height: 22, borderRadius: 9999, flexShrink: 0,
        border: 'none', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: checked ? '#16a34a' : '#dc2626', transition: 'background 150ms',
      }}
    >
      <span
        style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 180ms cubic-bezier(.4,0,.2,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}
