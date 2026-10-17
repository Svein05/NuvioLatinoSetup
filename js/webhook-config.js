/**
 * Configuración dinámica para el Webhook de Discord de sugerencias de avatares.
 * En desarrollo local o forks sin secretos, se puede configurar opcionalmente vía localStorage ('nuvio_dev_webhook_url').
 * En producción (GitHub Pages), GitHub Actions inyecta el secreto DISCORD_WEBHOOK_URL.
 */
export const INJECTED_WEBHOOK_CONFIG = {
  webhookUrl: ""
};
