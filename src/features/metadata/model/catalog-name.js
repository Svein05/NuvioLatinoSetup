export function renamedMetadataCatalog(template, id, title) {
  if (!template || !id) return template;
  const catalogs = template.config?.catalogs || template.catalogs;
  if (!Array.isArray(catalogs)) return template;
  const index = catalogs.findIndex(catalog => catalog.id === id);
  if (index < 0) return template;
  const renamed = catalogs.map((catalog, position) => position === index ? { ...catalog, name: title } : catalog);
  return template.config?.catalogs
    ? { ...template, config: { ...template.config, catalogs: renamed } }
    : { ...template, catalogs: renamed };
}
