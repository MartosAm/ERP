export interface LineaCarrito {
  productoId: string;
  nombre: string;
  sku: string;
  precioUnitario: number;
  cantidad: number;
  descuento: number;
  imagenUrl: string | null;
  impuestoIncluido: boolean;
  tasaImpuesto: number;
  stockDisponible: number | null;
  tipoUnidad: string;
}

export type ListaPrecio = 1 | 2 | 3;
