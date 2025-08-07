/**
 * Middleware para validar tokens de servicio
 */
export default (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      // Verificamos si la ruta es la de generar contrato
      if (ctx.request.url.includes("/api/reservas/generate-contract")) {
        // Obtenemos el token de autorización
        const authHeader = ctx.request.header.authorization

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return ctx.unauthorized("Token de autorización requerido")
        }

        const token = authHeader.substring(7)
        const serviceToken = process.env.SERVICE_TOKEN

        // Verificamos si el token coincide con el token de servicio
        if (token !== serviceToken) {
          // Si no coincide, verificamos si es un token de usuario válido
          try {
            // Intentamos verificar el token de usuario
            await strapi.plugins["users-permissions"].services.jwt.verify(token)
          } catch (error) {
            return ctx.unauthorized("Token de autorización inválido")
          }
        }
      }

      await next()
    } catch (error) {
      strapi.log.error("Error en middleware de autenticación:", error)
      ctx.throw(500, "Error interno")
    }
  }
}
