const strapi = require("@strapi/strapi") // Declare the strapi variable

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 */

module.exports = {
  // Tarea para limpiar consultas problemáticas
  "0 0 * * *": async () => {
    try {
      // Limpiar estadísticas de base de datos que pueden causar problemas
      if (strapi.db && strapi.db.connection) {
        await strapi.db.connection
          .raw(`
          -- Actualizar estadísticas de PostgreSQL
          ANALYZE;
        `)
          .catch(() => {
            console.log("Statistics update skipped")
          })
      }
    } catch (error) {
      console.log("Cron job warning:", error.message)
    }
  },
}
