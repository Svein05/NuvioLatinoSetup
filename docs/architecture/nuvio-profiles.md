# Contratos de perfiles Nuvio

Revisión de protocolo: 19 de octubre de 2026. Se contrastaron los parámetros con
el [cliente oficial de Nuvio TV](https://github.com/NuvioMedia/NuvioTV/blob/dev/app/src/main/java/com/nuvio/tv/core/sync/ProfileSyncService.kt)
y el [esquema público oficial del backend](https://github.com/NuvioMedia/self-host/blob/main/database/migrations/00000000000000_baseline.sql),
incluida su [migración de sincronización](https://github.com/NuvioMedia/self-host/blob/main/database/migrations/00000000000011_hosted_sync_updates.sql).
Se consultaron hechos del protocolo; no se incorporó código de esos proyectos.

- `sync_pull_profiles` identifica perfiles por `profile_index`; el UUID de la fila
  es otra identidad. No deducir índices de la posición en una lista.
- `sync_push_profiles` actualiza/inserta perfiles. Omitir un perfil del array no
  es una operación de eliminación.
- `sync_delete_profile_data(p_profile_id)` elimina el registro y sus datos según
  el esquema público. Verificar que ya no aparezca antes de declarar éxito.
- Algunas versiones admiten `p_origin_client_id`; otras no. Solo un rechazo de
  firma RPC permite repetir sin ese parámetro, porque la operación no se ejecutó.
  Nunca repetir una escritura cuyo resultado de red sea desconocido.

La integración nueva comprueba lecturas, conserva avatares, herencia y campos de
fondo conocidos al preparar cambios, y verifica el resultado. Un fallo al consultar
perfiles no equivale a una cuenta sin perfiles y nunca genera un reemplazo vacío.
Los respaldos REST solo se usan tras incompatibilidades de esquema reconocidas.

Las pruebas usan cuentas y red ficticias. La versión pública del backend es una
referencia de contrato; no demuestra que una instancia concreta tenga idéntica
migración. No se crearon, editaron ni eliminaron perfiles reales para verificarlo.
