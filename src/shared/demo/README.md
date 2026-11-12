# Códigos de demostración del asistente

Permiten revisar la interfaz sin autorizar cuentas externas. Se escriben en el
campo de identificador de cualquier conexión y se pulsa «Comprobar conexión».

| Código | Resultado |
| --- | --- |
| `NUVIO-DEMO-OK` | Cuenta conectada y listas de ejemplo. |
| `NUVIO-DEMO-EMPTY` | Cuenta conectada sin listas disponibles. |
| `NUVIO-DEMO-SLOW` | Carga lenta, luego conexión válida. |
| `NUVIO-DEMO-EXPIRED` | Conexión vencida. |
| `NUVIO-DEMO-WRONG` | Identificador de otro servicio. |
| `NUVIO-DEMO-ERROR` | Error al comprobar la conexión. |
| `NUVIO-DEMO-LISTS-ERROR` | Conexión válida, lectura de listas no disponible. |
| `NUVIO-DEMO-PREMIUM` | Restricción PRO/VIP de listas personalizadas en Simkl. |

Para TMDB y MDBList, los códigos `NUVIO-DEMO-OK`, `NUVIO-DEMO-SLOW`,
`NUVIO-DEMO-INVALID` y `NUVIO-DEMO-ERROR` representan validación correcta,
carga lenta, clave inválida y servicio no disponible. Se pueden combinar para
revisar resultados distintos en cada tarjeta.

Los códigos no se envían a los proveedores. Cualquier código con el prefijo
reservado `NUVIO-DEMO-`, incluso desconocido, bloquea la instalación final y las
exportaciones; también lo hace una conexión ficticia ya comprobada. El bloqueo
se comprueba de nuevo antes de ejecutar la configuración o exportarla.

Para probar sin cuenta de Nuvio, elige modo manual. Para salir de la demostración,
quita las conexiones ficticias y borra o reemplaza los códigos en los campos.
Los datos de demostración no se guardan en la sesión del navegador.
