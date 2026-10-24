/** Stable browser identity for server-side deduplication; never a credential. */
export function createCompletionIdentity({ storage, uuid = () => crypto.randomUUID() }) {
  let memory;
  return () => {
    if (memory) return memory;
    try { memory = storage.getItem('nuvio_completion_client_id'); } catch { /* Storage is optional. */ }
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(memory || '')) memory = uuid();
    try { storage.setItem('nuvio_completion_client_id', memory); } catch { /* Retain in memory. */ }
    return memory;
  };
}
