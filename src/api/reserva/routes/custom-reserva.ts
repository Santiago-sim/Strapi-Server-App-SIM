export default {
  routes: [
    {
      method: "POST",
      path: "/reservas/generate-contract",
      handler: "reserva.generateContract",
      config: {
        // Permitir acceso público y desde el lifecycle hook
        policies: [],
        auth: false, // Cambiar a false para permitir acceso sin autenticación
      },
    },
    {
      // Nueva ruta para actualizar una reserva con el contrato firmado
      method: "PUT",
      path: "/reservas/:id/signed-contract",
      handler: "reserva.updateWithSignedContract",
      config: {
        policies: [],
        auth: false, // Permitir acceso público para pruebas, ajustar según tus necesidades de seguridad
      },
    },
  ],
}
