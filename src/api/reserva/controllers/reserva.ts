/**
 *  reserva controller
 */

import { factories } from "@strapi/strapi"
import type { Context } from "koa"
import type { Reservation } from "../../../types/reservation"
import * as fs from "fs"
import * as path from "path"
import FormData from "form-data"
import axios from "axios"
import PDFDocument from "pdfkit"

export default factories.createCoreController("api::reserva.reserva", ({ strapi }) => ({
  async generateContract(ctx: Context) {
    let tempFilePath = ""
    const isInternalCall = !ctx.request.header || !ctx.request.header.host

    try {
      //* Validacion del request*
      const { reservationId } = ctx.request.body as { reservationId: number }

      if (!reservationId) {
        return ctx.badRequest("Reservation ID is required")
      }

      //* Obtener la reserva con todas las relaciones necesarias*
      const reservation = (await strapi.entityService.findOne("api::reserva.reserva", reservationId, {
        populate: {
          users_permissions_user: {
            fields: ["username", "email", "firstName", "lastName", "Phone", "Nationality"],
          },
          tour_id: {
            fields: ["nombre", "descripcion", "precio", "ubicacion"],
          },
        },
      })) as unknown as Reservation

      if (!reservation) {
        return ctx.notFound("Reservation not found")
      }

      const user = reservation.users_permissions_user
      const tour = reservation.tour_id

      if (!user || !tour) {
        return ctx.internalServerError("User or Tour data is missing")
      }

      // Crear un array para almacenar los chunks del PDF
      const chunks: Buffer[] = []

      // Generar el PDF con PDFKit
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
      })

      // Capturar los chunks del PDF en memoria
      doc.on("data", (chunk) => {
        chunks.push(chunk)
      })

      // Configurar fuente y tamaño
      doc.font("Helvetica-Bold")

      // Título centrado con formato exacto al proporcionado
      doc.fontSize(12).text("CONTRATO DE PRESTACION  DEL SERVICIO  TURISTICO DE  TOUR QUE", {
        align: "center",
      })
      doc.fontSize(12).text('CELEBRA  COMO PRESTADOR "SITIOS  DE  INTERES  MÉXICO" Y COMO', {
        align: "center",
      })

      // Nombre del cliente (línea amarilla)
      const nombreCompleto = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "CLIENTE"
      doc.fontSize(12).text(`TURISTA ${nombreCompleto}; LOS CUALES EN COMUNIDAD SE OTORGAN`, {
        align: "center",
      })

      doc.fontSize(12).text("PRESTACIONES Y SE SOMETEN A LOS DEBERES QUE CONSTAN EN ESTA", {
        align: "center",
      })
      doc.fontSize(12).text("ACTA, Y PREVIO A PUNTUALIZARLAS REALIZAN LAS SIGUIENTES:", {
        align: "center",
      })
      doc.moveDown(1)

      // Declaraciones
      doc.fontSize(12).text("DECLARACIONES", {
        align: "center",
        underline: true,
      })
      doc.moveDown(0.5)

      // Declaración del prestador
      doc.fontSize(11).text("I. DECLARA EL PRESTADOR DE SERVICIOS TURISTICO:")
      doc.moveDown(0.5)
      doc
        .fontSize(10)
        .text(
          "1. QUE ES UNA AGENCIA DE VIAJES REGISTRADA ANTE LA SECRETARÍA DE TURISMO EN EL REGISTRO NACIONAL DE TURISMO SEGUN EL CERTIFICADO DE INSCRIPCIONN CON NUMERO 0417028467cb6.",
        )
      doc
        .fontSize(10)
        .text(
          "2. QUE TIENE POR DOMICILIO EL QUE SE ENCUENTRA EN CIRCUITO SANTA FE 29, CLUB DE GOLF SANTA FE, XOCHITEPEC, MORELOS, CP: 62790.",
        )
      doc
        .fontSize(10)
        .text(
          "3. QUE CUENTA  CON  LAS  CAPACIDADES  MATERIALES,  HUMANOS Y FINANCIERAS PARA CUMPLIR CON EL OBJETO DEL CONTRATO.",
        )
      doc.fontSize(10).text("4. QUE EL REGISTRO FEDERAL DE CONTRIBUYENTE ES VEUS9408SX0.")
      doc
        .fontSize(10)
        .text(
          "5. QUE EN ESTE ACTO LO HACE POR CONDUCTO DEL c. SANTIAGO JOSE VERDUZCO UZCANGA, MISMO QUE ES CAPAZ Y SE ENCUENTRA EN PLENITUD DE SUS FACULTADES.",
        )
      doc
        .fontSize(10)
        .text(
          "6. QUE  SEÑALA  COMO  DOMICILIO  CONVENCIONAL  EL  QUE  SE ENCUENTRA EN AVENIDA DE LAS FUENTES 41-A, PISO 12, COLONIA LOMAS DE TECAMACHALCO, C.P. 53950, NAUCALPAN DE JUAREZ, EN EL ESTADO DE MEXICO, MEXICO.",
        )
      doc
        .fontSize(10)
        .text(
          "7. QUE  LA  PAGINA  WEB  DEL  PRESTADOR  DE  SERVICIOS  ES  LA SIGUIENTE https://sitiosdeinteresmexico.com",
        )

      // Email de contacto (línea amarilla)
      const emailContacto = "admin@sitiosdeinteresmexico.com"
      doc
        .fontSize(10)
        .text(
          `8. QUE EL   CORREO   ELECTRONICO   DE   CONTACTO   ES: ${emailContacto} Y NUMERO  TELEFONICO  DE  ATENCION  Y REFERENCIAS ES: (+52) 55 68 88 86 86.`,
        )

      doc
        .fontSize(10)
        .text(
          "9. QUE  PARA  LA  CONTRATACION  DEL  SERVICIO  TURISTICO  SE  DA CUMPLIMIENTO A LA LEY GENERAL DE TURISMO Y SU REGLAMENTO.",
        )
      doc.moveDown(1)

      // Declaración del turista
      doc.fontSize(11).text("II. DECLARA EL TURISTA")
      doc.moveDown(0.5)

      // Nacionalidad (línea amarilla)
      const nacionalidad = user.Nationality || "No especificada"
      doc
        .fontSize(10)
        .text(`1. QUE ES DE NACIONALIDAD ${nacionalidad}, RESIDE EN SU PAIS EN LA SIGUIENTE DIRECCION ______________.`)

      doc
        .fontSize(10)
        .text(
          "2. QUE ES SU DESEO CONTRATAR LOS SERVICIOS DEL PRESTADOR DE  SERVICIOS  TURISTICOS  PARA  CONOCER  LOS  RECURSOS HUMANOS, CULTURALES Y NATURALES DE MÉXICO.",
        )
      doc.fontSize(10).text("3. QUE ES SOLVENTE Y CUENTA CON LOS RECURSOS SUFICIENTES PARA CRUBIR CON SUS DEBERES")
      doc
        .fontSize(10)
        .text(
          "4. QUE  BAJO  PROTESTA  DE  MANIFESTARSE  CON  VERDAD RESPECTO A LOS ORIGINES DE SUS INGRES QUE, ESTOS NO SON DE PROCEDENCIA ILICITA.",
        )

      // Email y teléfono del turista (línea amarilla)
      const emailTurista = user.email || "No especificado"
      const telefonoTurista = user.Phone || "No especificado"
      doc
        .fontSize(10)
        .text(`5. QUE  SU  CORREO  ELECTRONICO  ES ${emailTurista} Y  SU NUMERO TELEFONO ${telefonoTurista}.`)

      // Hospedaje (línea amarilla)
      doc.fontSize(10).text("6. QUE SE HOSPEDARA EN: Hotel/Alojamiento no especificado.")
      doc.moveDown(1)

      // Declaraciones conjuntas
      doc.fontSize(11).text("IV.- LAS PARTES DECLARAN")
      doc.moveDown(0.5)
      doc
        .fontSize(10)
        .text(
          "1. QUE  EN  CELEBRACION  DEL  PRESENTE  ACTO  NO  EXISTIO ERROR,  DOLO  MALA  FE  O  CUALQUIER  OTRO  VICIO  EN  EL CONSENTIMIENTO DE LAS PARTES QUE PUDIERA ANULAR EN CONTENIDO DEL PRESENTE CONTRATO.",
        )
      doc
        .fontSize(10)
        .text(
          "2. QUE  LAS  PARTES  UTILIZARAN  TECNOLOGIAS  DE  LA INFORMACION Y COMUNICACION, POR LO QUE ADMITEN LAS PRACTICAS Y COSTUMBRES GENERALES.",
        )

      // Estado (línea amarilla)
      const ubicacion = tour.ubicacion || "Ciudad de México"
      doc.fontSize(10).text(`3. QUE EL SERVICIO QUE SE CONTRATARA TOMARA LUGAR EN EL ESTADO ${ubicacion}, MEXICO.`)

      doc.fontSize(10).text("4. QUE PUNTO DE ORIGEN SERA EL HOSPEDAJE")
      doc.fontSize(10).text("5. QUE TODOS LOS PRECIOS SON EN PESOS MEXICANOS")
      doc
        .fontSize(10)
        .text(
          "6. QUE SE RECONOCEN MUTUAMENTE LA PERSONALIDAD QUE OSTENTAN Y ESTAN DE ACUERDO EN CELEBRAR EL PRESENTE CONTRATO AL TENOR DE LOS SIGUIENTES:",
        )
      doc.moveDown(1)

      // Cláusulas
      doc.fontSize(12).text("C L A U S U L A S", {
        align: "center",
        underline: true,
      })
      doc.moveDown(1)

      // Primera cláusula
      doc
        .fontSize(10)
        .text(
          'PRIMERA.-LAS  PARTES  PACTAN  QUE  EN  CASO  DE  EVENTOS  QUE ARRIESGUEN EL  CUMPLIMIENTO  MATERIAL  O  JURIDICO  DE LAS PRESTACIONES  DEL  CONTRATO O  EL  OBJETO  DEL  MISMO, SE INVOLUCRARA A LA ASOCIACION CIVIL "ASIA-AMERICA ENLACE", LA QUE SE CONSTITUYO BAJO  LA  FE  DEL  NOTARIO  PUBLICO  NUMERO  239  DE  LA CIUDAD DE MEXICO EN EL TESTIMONIO NOTARIAL NUMERO 20,232 PARA DESIGNARLA  COMO REPRESENTANTE  LEGAL  Y  ASESORA  JURIDICA; ENCONTRANDOSE  EN  CONSECUENCIA,  CON FACULTADES  SUFICIENTES PARA INTERPONER RECURSOS Y PROMOVER ACCIONES PARA DEFENDER EL CUMPLIMIENTO DEL CONTRATO; ASI COMO LOS DERECHOS HUMANOS Y GARANTIAS INDIVIDUALES QUE TIENE EL TURISTA. MAXIME SI SE ATENTA CONTRA LA LIBERTAD PERSONAL AL RECONOCERSE QUE EL TURISTA ES EXTRANJERO,  NO  HABLA  EL  IDIOMA  ESPAÑOL Y SE  ENCUENTRA EN  EL TRAFICO INTERNACIONAL;',
        )
      doc.moveDown(0.5)

      doc
        .fontSize(10)
        .text(
          "O EN SUPUESTO DE QUE EL TURISTA SEA NACIONAL, LAS PARTES PACTAN QUE SE PROPORCIONARA GRATUITAMENTE ASESORIA JURIDICA, A CARGO DEL  PRESTADOR  DE  SERVICIOS  TURISTIVOS,  LA  CUAL  DEBERA  SER ADECUADA,  TOTAL  Y  CONGRUENTEPOR  PERSONA  DEBIDAMENTE PORTADORA DE CEDULA Y TITULO PROFESIONAL COMO PROFESIONAL EN DERECHO, Y TENDERA A QUE SE CUMPLA EL OBJETO DEL CONTRATO.",
        )
      doc.moveDown(0.5)

      // Segunda cláusula
      doc
        .fontSize(10)
        .text(
          "SEGUNDA.- QUE EL SERVICIO DE TOUR CONSISTE EN EL DESPLAZAMIENTO PERSONAL DEL TURISTA DE UN PUNTO DE ORIGEN A LAS ATRACCIONES TURISTICAS QUE SE NOTIFIQUEN. LAS PARTES ACUERDAN QUE EL VIAJE INICIA AL MOMENTO QUE EL TURISTA ABORDA EL TRANSPORTE Y TERMINA AL MOMENTO DEL ÚLTIMO DESCENSO.",
        )
      doc.moveDown(0.5)

      // Tercera cláusula
      doc
        .fontSize(10)
        .text(
          "TERCERA.-EL COSTO DEL SERVICIO SE RESPONDERA A LA SUMATORIA DE LOS  CONCEPOS  QUE  SE  PACTAN  EN  LAS  TAMBLAS TABLAS QUE  SE INSERTARAN.",
        )
      doc.moveDown(0.5)

      // Tabla de precios
      doc.fontSize(9).text("NUMERO DE PERSONAS")
      doc.fontSize(9).text("1  $2300.00")
      doc.fontSize(9).text("2 A 3  $2800.00")
      doc.fontSize(9).text("4 A 6  $3300.00")
      doc.fontSize(9).text("7 A 11  $6400.00")
      doc.fontSize(9).text("+12  $8300.00")
      doc.moveDown(0.5)

      doc.fontSize(9).text("NUMERO DE ATRACCIONES VISITADAS")
      doc.fontSize(9).text("1   $5000.00")
      doc.fontSize(9).text("2 A 5  $4600.00")
      doc.fontSize(9).text("6 A 8  $4200.00")
      doc.fontSize(9).text("+9  $3500.00")
      doc.moveDown(0.5)

      doc.fontSize(9).text("TIPO DE AUTOMOVIL")
      doc.fontSize(9).text("SEDAN  $4000.00")
      doc.fontSize(9).text("SEDAN PREMIUM  $8500.00")
      doc.fontSize(9).text("CAMIONETA – 3 PLAZAS-  $4600.00")
      doc.fontSize(9).text("CAMIONETA -5 PLAZAS-  $6000.00")
      doc.fontSize(9).text("CAMIONETA PREMIUM  $8500.00")
      doc.fontSize(9).text("SUBURBAN  $9500.00")
      doc.moveDown(0.5)

      doc.fontSize(9).text("HORAS EFECTIVAS DE TRANSPORTE")
      doc.fontSize(9).text("1 A 3 HORAS  $710.00 POR CADA HORA")
      doc.fontSize(9).text("4 A 6:00 HORAS  $550.00 POR CADA HORA")
      doc.fontSize(9).text("6 A 8:00 HORAS  $450.00 POR CADA HORA")
      doc.fontSize(9).text("8:00 A 9:00 HORAS  $420.00 POR CADA HORA")
      doc.fontSize(9).text("+10 HORAS  $400.00 POR CADA HORA")
      doc.moveDown(0.5)

      // Continuar con más cláusulas
      doc
        .fontSize(10)
        .text(
          "LAS PARTES CONVIENEN QUE EL NUMERO DE PASAJEROS DURANTE EL SERVICIO NO  PODRAN  VARIAR,  SALVO  EL AUMENTO RESPECTIVO  DE AUMENTO DE TARIFA. LA QUE SOLO ACEPTARA PRUEBA EN CONTRARIO POR PARTE DEL TURISTA.",
        )
      doc.moveDown(0.5)

      doc
        .fontSize(10)
        .text(
          "EN TORNO AL MEDIO DE TRANSPORTE EL TURISTA PODRA SOLICITAR EL CAMBIO DEL TRANSPORTE LA QUE SE CONCEDERA POR MUTUO ACUERDO.",
        )
      doc.moveDown(0.5)

      doc.fontSize(10).text("LAS PARTES ACUERDAN QUE LOS MONTOS QUE SE ESTABLECIERON EN LAS TABLAS SON ACUMULATIVOS.")
      doc.moveDown(0.5)

      // Cláusulas adicionales
      doc
        .fontSize(10)
        .text(
          "CUARTA.- EL PRESTADOR DE SERVICIOS SE COMPROMETE A LLEVAR UNA BITACORA EN LA QUE MINIMAMENTE SE IDENTIFIQUE LA ATRACCION QUE SE VISITO, LA HORA EN LA QUE SE LLEGO Y LA HORA EN LA QUE SE RETIRO.",
        )
      doc.moveDown(0.5)

      doc
        .fontSize(10)
        .text(
          "QUINTA.- LAS  PARTES  ACUERDAN  QUE DESCENSO  POR  ATRACCION CONSISTIRAN TODAS AQUELLAS MENOS LAS QUE SEAN EN TIENDAS DE CONVINIENCIA Y SANITARIOS PUBLICOS.",
        )
      doc.moveDown(0.5)

      doc
        .fontSize(10)
        .text("SEXTA.- SERA  CARGA  DEL  PRESTADOR  DE  SERVICIOS  EL  PAGO  DE ESTACIONAMIENTOS Y GASOLINA.")
      doc.moveDown(0.5)

      doc
        .fontSize(10)
        .text(
          "SEPTIMA.- RECARGAR GASOLINA MAS DE UNA VEZ SIN JUSTIFICACION A RAZON DE DISTANCIA RECORRIDA Y TIEMPO, HARA QUE EL PRESTADOR DE SERVICIO SEA MERECEDORA A UNA PENA CONVENCIONAL DEL 10% DEL TOTAL DEL SERVICIO.",
        )
      doc.moveDown(0.5)

      // Décima octava cláusula - Servicios contratados
      doc.fontSize(10).text("DECIMA  OCTAVA.- LAS  PARTES  ACUERDAN  QUE  LOS  SERVICIOS CONTRATADOS SERAN:")
      doc.moveDown(0.5)

      // Información del tour contratado
      doc.fontSize(9).text("NUMERO DE PERSONAS")
      doc.fontSize(9).text("1  X")
      doc.fontSize(9).text("2 A 3")
      doc.fontSize(9).text("4 A 6")
      doc.fontSize(9).text("7 A 11")
      doc.fontSize(9).text("+12")
      doc.moveDown(0.5)

      doc.fontSize(9).text("NUMERO DE ATRACCIONES VISITADAS")
      doc.fontSize(9).text(`1   ${tour.nombre}`)
      doc.fontSize(9).text("2 A 5")
      doc.fontSize(9).text("6 A 8")
      doc.fontSize(9).text("+9")
      doc.moveDown(0.5)

      doc.fontSize(9).text("TIPO DE AUTOMOVIL")
      doc.fontSize(9).text("SEDAN  X")
      doc.fontSize(9).text("SEDAN PREMIUM")
      doc.fontSize(9).text("CAMIONETA – 3 PLAZAS-")
      doc.fontSize(9).text("CAMIONETA – MAXIMO 5 PLAZAS-")
      doc.fontSize(9).text("CAMIONETA PREMIUM")
      doc.fontSize(9).text("CAMIONETA DE MÁS DE 5 PLAZAS")
      doc.moveDown(0.5)

      // Cláusulas finales
      doc
        .fontSize(10)
        .text("DECIMA  NOVENA.- LAS  PARTES  PACTAN  QUE  LOS  COSTOS  DE  LAS ATRACCIONES SERAN A COSTA DEL TURISTA.")
      doc.moveDown(0.5)

      doc
        .fontSize(10)
        .text(
          "ASI COMO QUE ACUERDAN QUE EL TIPO DEL CAMBIO PARA: EL DOLAR - MONEDA DE USO CORRIENTE DE LOS ESTADOS UNIDOS DE AMERICA- SERA DE  $15.00  (QUINCE  PESOS  MONEDA  NACIONAL  00/100)  POR  CADA  UNO, PARA EL EURO -MONEDA DE USO CORRIENTE EN LA UNION EURPEA- $16.50 (DIECISEIS PESOS CON CINCUENTA CENTAVOS MONEDA NACIONAL 50/100), Y PARA EL YUAN (MONEDA DE USO CORRIENTE EN LA REPUBLICA POPULAR CHINA) (MONEDA NACIONAL).",
        )
      doc.moveDown(0.5)

      // Firmas
      doc.moveDown(2)
      doc
        .fontSize(10)
        .text(
          "HABIENDO LEIDO TODAS Y CADA UNA DE LAS PARTES DE ESTE CONTRATO, ASÍ COMO LAS CONSECUENCIAS QUE SE DERIVAN DEL MISMO POR MEDIOS ELECTRONICOS EL DÍA " +
            new Date().getDate() +
            " DEL MES " +
            new Date().toLocaleString("es-MX", { month: "long" }) +
            " DE DOS MIL VEINTICINCO",
        )

      doc.moveDown(2)
      doc.fontSize(10).text("_______________________", { align: "left" })
      doc.fontSize(10).text("PRESTADOR DE SERVICIOS", { align: "left" })

      doc.moveDown(2)
      doc.fontSize(10).text("_______________________", { align: "right" })
      doc.fontSize(10).text(`${nombreCompleto}`, { align: "right" })
      doc.fontSize(10).text("TURISTA", { align: "right" })

      // Finalizar el PDF y manejar el resultado cuando esté completo
      doc.end()

      // Esperar a que el PDF se genere completamente
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on("end", () => {
          // Combinar todos los chunks en un solo buffer
          resolve(Buffer.concat(chunks))
        })
      })

      // Modificar la parte de guardar el archivo temporal
      if (!isInternalCall) {
        // Si es una llamada externa, guardar el archivo temporal
        const tempDir = path.join(process.cwd(), "tmp")
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }

        // Generate a unique filename
        const filename = `contrato-${reservationId}-${Date.now()}.pdf`
        tempFilePath = path.join(tempDir, filename)

        // Save PDF to a temporary file
        fs.writeFileSync(tempFilePath, pdfBuffer)
      }

      // Modificar la parte de subir el archivo
      try {
        // SIMPLIFIED APPROACH: Use the Strapi API directly
        const strapiUrl = process.env.STRAPI_URL || "http://localhost:1337"
        const adminToken = process.env.STRAPI_ADMIN_TOKEN
        const userToken = process.env.STRAPI_USER_TOKEN

        if (!adminToken && !userToken) {
          console.warn("No STRAPI_ADMIN_TOKEN or STRAPI_USER_TOKEN found. File upload may fail.")
        }

        // Create a new FormData instance
        const form = new FormData()

        if (isInternalCall) {
          // Si es una llamada interna, usar el buffer directamente
          form.append("files", pdfBuffer, {
            filename: `contrato-${reservationId}-${Date.now()}.pdf`,
            contentType: "application/pdf",
          })
        } else {
          // Si es una llamada externa, usar el archivo temporal
          form.append("files", fs.createReadStream(tempFilePath), {
            filename: path.basename(tempFilePath),
            contentType: "application/pdf",
          })
        }

        // Add the reference information
        form.append("ref", "api::reserva.reserva")
        form.append("refId", reservationId.toString())
        form.append("field", "contrato_generado")

        // Make the request to upload the file
        const uploadResponse = await axios({
          method: "post",
          url: `${strapiUrl}/api/upload`,
          data: form,
          headers: {
            ...form.getHeaders(),
            Authorization: userToken ? `Bearer ${userToken}` : adminToken ? `Bearer ${adminToken}` : undefined,
          },
        })

        //console.log("Upload successful:", uploadResponse.data)
      } catch (uploadError) {
        console.error("Error uploading file:", uploadError)
      }

      //* Devolver respuesta*
      ctx.set("Content-Type", "application/pdf")
      ctx.send(pdfBuffer)
    } catch (error) {
      console.error("Detailed error:", error)
      strapi.log.error(`Error generando contrato: ${error}`)
      ctx.internalServerError("Error al generar el contrato")
    } finally {
      // Wait a moment before deleting the file to ensure it's not being used
      setTimeout(() => {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath)
            //console.log("Temporary file deleted")
          } catch (err) {
            console.warn("Failed to delete temporary file:", err)
          }
        }
      }, 1000) // Wait 1 second before deleting
    }
  },
  /**
   * Actualiza una reserva con el contrato firmado
   * @param {object} ctx - Contexto de Koa
   */
  async updateWithSignedContract(ctx) {
    try {
      const { id } = ctx.params
      const { data } = ctx.request.body

      // Verificar si la reserva existe
      const reservation = await strapi.entityService.findOne("api::reserva.reserva", id)
      if (!reservation) {
        return ctx.notFound("Reserva no encontrada")
      }

      // Verificar si el usuario tiene permiso para actualizar esta reserva
      // Esto dependerá de tu lógica de autenticación y autorización
      // Por ejemplo, podrías verificar si el usuario es el propietario de la reserva

      // Actualizar la reserva con el contrato firmado
      const updatedReservation = await strapi.entityService.update("api::reserva.reserva", id, {
        data: {
          documentoFirmado: true,
          // Otros campos que quieras actualizar
        },
      })

      return updatedReservation
    } catch (error) {
      console.error("Error al actualizar la reserva con contrato firmado:", error)
      return ctx.badRequest("Error al actualizar la reserva")
    }
  },
}))
