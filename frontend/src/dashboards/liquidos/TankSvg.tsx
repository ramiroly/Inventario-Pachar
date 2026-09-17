import { useId } from "react";

interface Props {
  litros: number;
  prev: number | null;
  cap: number | null;
  colorDark: string;
  colorLight: string;
  width: number;
  height: number;
}

/**
 * Porteo directo de `buildSVG()` de INVENTARIO DE LIQUIDOS 1 DE SETIEMBRE.html:
 * un tanque rectangular donde el nivel actual se dibuja oscuro y el nivel
 * anterior se ve como una franja más clara detrás (si prev > actual, queda
 * una línea punteada marcando el nivel anterior más alto).
 */
export function TankSvg({ litros, prev, cap, colorDark, colorLight, width: W, height: H }: Props) {
  const uid = useId();
  const rx = 6;
  const innerH = H - 8;
  const capacidad = cap && cap > 0 ? cap : null;
  const pN = capacidad ? Math.min(1, litros / capacidad) : 0;
  const pP = capacidad && prev !== null ? Math.min(1, prev / capacidad) : null;
  const hN = Math.round(pN * innerH);
  const hP = pP !== null ? Math.round(pP * innerH) : null;
  const yN = H - 4 - hN;
  const yP = hP !== null ? H - 4 - hP : null;
  const pct = Math.round(pN * 100);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={uid}>
          <rect x={3} y={3} width={W - 6} height={H - 6} rx={rx - 1} />
        </clipPath>
      </defs>
      <rect x={2} y={2} width={W - 4} height={H - 4} rx={rx} fill="#F0F7F4" stroke={colorDark} strokeWidth={1.5} />
      {yP !== null && hP! > 0 && (
        <>
          <rect x={3} y={yP} width={W - 6} height={H - 3 - yP} fill={colorLight} clipPath={`url(#${uid})`} />
          {prev !== null && prev > litros && (
            <line x1={3} y1={yP} x2={W - 3} y2={yP} stroke={colorDark} strokeWidth={1} strokeDasharray="3,2" opacity={0.5} />
          )}
        </>
      )}
      {hN > 0 && (
        <>
          <rect x={3} y={yN} width={W - 6} height={H - 3 - yN} fill={colorDark} clipPath={`url(#${uid})`} />
          <line x1={3} y1={yN} x2={W - 3} y2={yN} stroke="#fff" strokeWidth={1.5} opacity={0.35} />
        </>
      )}
      <rect x={2} y={2} width={W - 4} height={H - 4} rx={rx} fill="none" stroke={colorDark} strokeWidth={1.5} />
      {hN > 18 ? (
        <text
          x={Math.round(W / 2)}
          y={yN + Math.round(hN / 2)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Segoe UI, Arial, sans-serif"
          fontSize={W > 55 ? 11 : 9}
          fontWeight={700}
          fill="#fff"
          paintOrder="stroke"
          stroke="#000"
          strokeWidth={2}
          strokeLinejoin="round"
        >
          {pct}%
        </text>
      ) : (
        litros > 0 && (
          <text
            x={Math.round(W / 2)}
            y={yN - 6}
            textAnchor="middle"
            fontFamily="Segoe UI, Arial, sans-serif"
            fontSize={9}
            fontWeight={700}
            fill={colorDark}
          >
            {pct}%
          </text>
        )
      )}
    </svg>
  );
}
