export interface Reservation {
  id: number
  Fecha?: string
  Mensaje?: string
  Confirmacion?: boolean
  documentoFirmado?: boolean
  docusignEnvelopeId?: string
  users_permissions_user?: {
    id: number
    username?: string
    email?: string
    firstName?: string
    lastName?: string
    Phone?: string
    Nationality?: string
  }
  tour_id?: {
    id: number
    nombre: string
    descripcion: string
    precio: number
    ubicacion?: string
  }
}
