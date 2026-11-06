# Ventanas emergentes

La referencia visual es «Agregar addon». Todas las ventanas del asistente usan
`popup-overlay` en la capa exterior y `popup-panel` en la superficie interior.
El reproductor nativo `<dialog>` usa `popup-panel` y conserva su propio backdrop.

- Superficie oscura sólida `#0b0d12`, borde blanco tenue y radio de 26 px.
  No sustituirla por `lat-card`, transparencias por ventana o gradientes propios.
- Encabezado compacto con Instrument Sans, título de 14 px, icono opcional y
  separador. Reservar la tipografía editorial para las secciones de la página.
- Un solo control de cierre en el encabezado. «Cancelar» puede permanecer como
  acción secundaria en el pie; no añadir otro botón «Cerrar» redundante.
- Acciones al pie con `popup-actions`: secundaria primero y principal después,
  alineadas al final y con salto de línea cuando sea necesario. Las acciones
  destructivas mantienen su color rojo, sin cambiar el material de la ventana.
- Tamaño determinado por el contenido, con ancho máximo adecuado a su función.
  En ventanas extensas, limitar la altura al viewport y permitir desplazamiento
  del contenido; nunca recortar títulos, controles ni indicadores de foco.
- Campos con los controles compartidos. Las búsquedas con icono usan
  `popup-search` para reservar espacio real dentro del campo.
- Conservar foco atrapado, Escape, retorno del foco, nombre accesible y estados
  de carga/error. Reutilizar el ciclo existente de apertura y cierre; no duplicar
  listeners ni modificar datos al abrir una ventana.

Las diferencias de ancho o distribución justificadas por un reproductor,
catálogo o formulario no deben cambiar la paleta, la tipografía del encabezado
ni la jerarquía de acciones.
