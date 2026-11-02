# Recursos públicos y caché

Los endpoints de catálogo y estrellas usan el binding existente `POSTER_FEED_KV`,
con claves independientes bajo `public-metadata:v1:`. No leen ni modifican los
contadores, el ranking ni el feed de TMDB. Las imágenes conservan su alojamiento.

`/api/avatars/catalog` devuelve `registry`, `revision`, `hashes`, `updatedAt` y
`stale`. Comprueba la revisión de GitHub cada cinco minutos y descarga el árbol
solo cuando cambia. Rechaza árboles truncados y conserva el catálogo anterior
ante errores. Los hashes identifican los bytes de cada avatar para evitar mostrar
una miniatura antigua cuando un colaborador reemplaza un archivo bajo la misma URL.

`/api/repository/stars` devuelve `count`, `updatedAt` y `stale`. Su actualización
tiene una vigencia de seis horas. Si no existe una copia válida y GitHub falla,
responde 503; el frontend conserva su último valor confirmado o muestra «—».

Con una copia antigua, el Worker la sirve mientras actualiza mediante `waitUntil`.
Las lecturas simultáneas de la misma instancia comparten la actualización y los
fallos conservan un intervalo de reintento. KV y las cachés HTTP son eventualmente
consistentes: una invalidación no equivale a propagación instantánea mundial.

Una publicación de avatares confirmada invalida el catálogo. Si esa invalidación
falla, se registra la advertencia sin repetir el commit ni presentar la publicación
confirmada como fallida. La siguiente actualización periódica recupera la revisión.

## Orden de publicación

Estos endpoints requieren desplegar el Worker antes del frontend que los utiliza.
Hasta entonces, el frontend puede mostrar el catálogo incluido y valores cacheados;
no se debe interpretar ese respaldo como una confirmación de datos remotos recientes.
El despliegue de la web y el del Worker son operaciones independientes.

## Caché del dominio

GitHub Pages sirve actualmente recursos con una vigencia de diez minutos. Para
ampliarla en producción, el administrador del dominio debe autorizar una regla
limitada a `guia.lat-add.com/assets/optimized/`, cuyos nombres incorporan el hash
del contenido. Una vigencia de un año es apropiada para esos archivos inmutables.
Los nombres nuevos permiten publicar cambios sin reutilizar bytes antiguos.

No aplicar esa regla a todo `/assets/`: existen originales, manifiestos y rutas
canónicas que se actualizan sin cambiar de nombre. Tampoco cachear respuestas
de autenticación, perfiles, secretos o escrituras de estadísticas. Un archivo
`_headers` en el repositorio no configura los encabezados de GitHub Pages.
