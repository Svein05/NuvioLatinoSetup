/** Manifest enrichment is optional after a confirmed save; report failure explicitly. */
export async function inspectMetadataManifest(read, { manifestUrl, signal }) {
  try {
    return { manifest: await read(manifestUrl, { signal }), verified: true, warnings: [] };
  } catch {
    signal?.throwIfAborted();
    return { manifest: null, verified: false, warnings: ['La configuración se guardó, pero no se pudo verificar su manifiesto.'] };
  }
}
