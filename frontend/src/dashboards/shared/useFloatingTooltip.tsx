import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Porteo del sistema de tooltip flotante que sigue al mouse usado en los 3
 * dashboards originales (`#ftt` / `#tt`): un div `position:fixed` cuyo
 * contenido y posición se actualizan con `mousemove`, evitando salirse del
 * viewport. `wrapperClassName` deja que cada dashboard aplique su propio
 * estilo de caja (colores/tamaños ya definidos en el CSS portado de cada
 * HTML original).
 */
export function useFloatingTooltip(wrapperClassName: string) {
  const [content, setContent] = useState<ReactNode | null>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const visible = content !== null;

  useEffect(() => {
    if (!visible) return;

    function handleMove(e: MouseEvent) {
      const el = ref.current;
      const w = el?.offsetWidth ?? 230;
      const h = el?.offsetHeight ?? 180;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = e.clientX + 16;
      let top = e.clientY + 10;
      if (left + w > vw - 4) left = e.clientX - w - 10;
      if (top + h > vh - 4) top = e.clientY - h - 10;
      if (left < 4) left = 4;
      if (top < 4) top = 4;
      setPos({ left, top });
    }
    document.addEventListener("mousemove", handleMove);
    return () => document.removeEventListener("mousemove", handleMove);
  }, [visible]);

  const tooltip = visible ? (
    <div
      ref={ref}
      className={wrapperClassName}
      style={{ position: "fixed", left: pos.left, top: pos.top, pointerEvents: "none", zIndex: 9999 }}
    >
      {content}
    </div>
  ) : null;

  return {
    show: (node: ReactNode) => setContent(node),
    hide: () => setContent(null),
    tooltip,
  };
}
