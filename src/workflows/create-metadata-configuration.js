/** Retry only an explicitly unsupported creation route, never an ambiguous write. */
export async function createMetadataConfiguration(save, { instances, payload, onAttempt, signal }) {
  if (!Array.isArray(instances) || !instances.length) throw new Error('No hay una instancia de AIOMetadata seleccionada.');
  const snapshot = structuredClone(payload);
  const warnings = [];
  for (const [index, instance] of instances.entries()) {
    signal?.throwIfAborted();
    onAttempt?.(instance, index + 1, instances.length);
    try {
      const result = await save(instance, structuredClone(snapshot), { signal });
      return { ...result, warnings };
    } catch (error) {
      signal?.throwIfAborted();
      if (error.outcome === 'unknown' || ![404, 405].includes(error.status) || index === instances.length - 1) throw error;
      warnings.push(`La instancia ${index + 1} no ofrece la ruta de creación (HTTP ${error.status}).`);
    }
  }
}
