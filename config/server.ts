export default ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  app: {
    keys: env.array("APP_KEYS"),
  },
  webhooks: {
    populateRelations: env.bool("WEBHOOKS_POPULATE_RELATIONS", false),
  },
  // Configuración adicional para resolver problemas de base de datos
  admin: {
    auth: {
      secret: env("ADMIN_JWT_SECRET"),
    },
  },
  // Configuraciones específicas para PostgreSQL
  settings: {
    database: {
      // Forzar el uso de transacciones menos estrictas
      forceTransactions: false,
      // Configurar el timeout de consultas
      timeout: 30000,
    },
  },
})
