const TAMANO_PAGINA = 1000;

/**
 * Supabase corta cada consulta en 1000 filas. Para sumar saldos eso no sirve:
 * una tabla que crece (movimientos) daria totales incompletos sin avisar.
 * Pide paginas de 1000 hasta traer todo. La consulta debe tener un orden fijo.
 */
export async function fetchAll<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await pagina(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(error.message);
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < TAMANO_PAGINA) return filas;
  }
}
