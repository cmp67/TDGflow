// Shimmering placeholder block — replaces plain "Carregando…" text per the
// Bemgsy design system ("nunca tela em branco/texto puro, skeleton
// obrigatório"). Uses the .skeleton keyframe defined in globals.css, which
// already rides on the design system's --ease-smooth curve.
export default function Skeleton({
  width = '100%',
  height = 14,
  borderRadius,
}: {
  width?: number | string
  height?: number | string
  borderRadius?: number | string
}) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  )
}
