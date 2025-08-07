import { Resend } from "resend";
import PDFDocument from "pdfkit";
import { createContract } from "../../services/create-contract";
// Fix: Remove incorrect Strapi import
// import { Strapi } from '@strapi/strapi';

declare var strapi: any;

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Interface Definitions ---
interface HotelDetails {
  nombre: string;
  noches: number;
  habitacion: string;
  reservaId: string;
  total: string;
}

interface User {
  id: number;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  Phone?: string;
  Nationality?: string;
}

interface Tour {
  id: number;
  nombre: string;
  descripcion: string;
}

interface Reserva {
  id: number;
  Fecha: string;
  Mensaje?: string;
  Confirmacion: boolean;
  documentoFirmado?: boolean;
  docusignEnvelopeId?: string;
  users_permissions_user?: User;
  tour_id?: Tour;
  email: string;
  personas: number;
  nombreCompleto: string;
  nacionalidad: string;
  telefono: string;
  tour?: any;
  user?: any;
  hotel?: HotelDetails;
  tipoGrupo: string;
  contrato_generado?: any;
}

async function sendDocumentForSigning(
  email: string,
  documentUrl: string
): Promise<string> {
  console.warn(
    "DocuSign integration is a placeholder. Implement sendDocumentForSigning."
  );
  return "placeholder-envelope-id";
}

// --- Main Lifecycle Hooks ---
export default {
  async afterCreate(event: { result: Reserva }) {
    const reserva = event.result;
    //console.log("New reservation created:", reserva);
    const reservaId = String(reserva.id);
    //console.log("Reserva ID:", reservaId);

    try {
      const contrato = await createContract(reservaId);
      //console.log("Contrato generado:", contrato);
    } catch (error) {
      console.error("Falló la generación del contrato:", error.message);
    }
    // await sendInitialNotificationToAdmin(reserva);
    // await sendInitialConfirmationToClient(reserva);
  },

  async afterUpdate(event: { result: Reserva }) {
    try {
      // Get the updated reservation
      const reserva = event.result;

      // Check if this is a file upload update (contrato_generado being updated)
      // Fix: Use the result object to check for file upload instead of params
      if (reserva.contrato_generado) {
        console.log(
          "Contract file detected in reservation, skipping email notifications"
        );
        return;
      }

      // Only proceed if we have a valid reservation with a user
      if (!reserva || !reserva.id) {
        console.log("Invalid reservation data in afterUpdate", reserva);
        return;
      }

      // Fetch the complete reservation with populated relations
      // Fix: Use strapi global variable directly without type casting
      const fullReserva = (await strapi.entityService.findOne(
        "api::reserva.reserva",
        reserva.id,
        {
          populate: ["users_permissions_user", "tour_id"],
        }
      )) as unknown as Reserva;

      // Safety check before accessing user properties
      if (!fullReserva.users_permissions_user) {
        console.log("No user associated with reservation", fullReserva.id);
        return;
      }

      const userEmail = fullReserva.users_permissions_user.email;

      if (userEmail) {
        if (fullReserva.Confirmacion && !fullReserva.documentoFirmado) {
          // Admin has confirmed, but document hasn't been signed yet
          try {
            const documentUrl = await generateDocumentUrl(fullReserva);
            //console.log("Document URL:", documentUrl);

            if (process.env.ENABLE_DOCUSIGN === "true") {
              const envelopeId = await sendDocumentForSigning(
                userEmail,
                documentUrl
              );
              await strapi.entityService.update(
                "api::reserva.reserva",
                fullReserva.id,
                {
                  data: { docusignEnvelopeId: envelopeId },
                }
              );
            } else {
              // If DocuSign is not enabled, immediately send Confirmation email
              // await sendConfirmationEmail(fullReserva, userEmail);
            }
          } catch (error) {
            console.error("Error in confirmation process:", error);
          }
        }

        if (fullReserva.Confirmacion && fullReserva.documentoFirmado) {
          // Both confirmed and signed - send itinerary
          try {
            await sendItineraryEmail(fullReserva);
          } catch (error) {
            console.error("Error sending itinerary:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error in afterUpdate lifecycle hook:", error);
    }
  },
};

// --- Helper Functions ---

async function generateDocumentUrl(reserva: Reserva): Promise<string> {
  console.warn(
    "generateDocumentUrl is a placeholder. Implement document generation and storage."
  );
  return `https://example.com/documents/reserva-${reserva.id}.pdf`;
}

async function generateItineraryPDF(reserva: Reserva): Promise<Buffer> {
  // Safety check
  if (!reserva.users_permissions_user) {
    throw new Error("User data is missing for PDF generation");
  }

  const user_data = reserva.users_permissions_user;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.fontSize(18).text("Itinerario de Viaje", { align: "center" });
    doc.moveDown();

    // Client Data - Fix: Add null checks and default values for all user fields
    doc
      .fontSize(14)
      .text(
        `Nombre: ${user_data.firstName || user_data.username || "No especificado"} ${user_data.lastName || ""}`
      )
      .text(
        `Nacionalidad: ${user_data.Nationality || reserva.nacionalidad || "No especificado"}`
      )
      .text(`Email: ${user_data.email || reserva.email || "No especificado"}`)
      .text(
        `Teléfono: ${user_data.Phone || reserva.telefono || "No especificado"}`
      )
      .text(
        `Fecha de viaje: ${reserva.Fecha ? new Date(reserva.Fecha).toLocaleDateString("es-MX") : "No especificado"}`
      )
      .moveDown();

    // Tour Details
    if (reserva.tour_id) {
      doc.fontSize(14).text("Detalles del Tour:", { underline: true });
      doc
        .fontSize(12)
        .text(
          `Nombre del Tour: ${reserva.tour_id.nombre || "No especificado"}`
        );
      doc
        .fontSize(12)
        .text(
          `Descripción: ${reserva.tour_id.descripcion || "No especificado"}`
        );
      doc.moveDown();
    }

    if (reserva.Mensaje) {
      doc
        .fontSize(14)
        .text("Requerimientos Especiales / Mensaje:", { underline: true });
      doc.fontSize(12).text(reserva.Mensaje);
      doc.moveDown();
    }

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);
    doc.end();
  });
}

async function sendItineraryEmail(reserva: Reserva) {
  try {
    // Safety check
    if (
      !reserva.users_permissions_user ||
      !reserva.users_permissions_user.email
    ) {
      throw new Error("User email is missing for sending itinerary");
    }

    const pdfBuffer = await generateItineraryPDF(reserva);
    const adminEmail = process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      throw new Error("ADMIN_EMAIL environment variable not set.");
    }

    const emailData = {
      from: "Sitios Interes México <admin@sitiosdeinteresmexico.com>",
      to: [reserva.users_permissions_user.email],
      cc: [adminEmail],
      subject: "Itinerario de Viaje Confirmado",
      text: `¡Su itinerario está listo! Adjunto encontrará los detalles de su reserva.\n\nGracias por elegirnos.`,
      attachments: [
        {
          filename: `Itinerario-${reserva.id}.pdf`,
          content: pdfBuffer,
        },
      ],
    };
    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      throw error;
    }
    console.log(
      `Itinerary sent to ${reserva.users_permissions_user.email}. Data:`,
      data
    );
  } catch (error) {
    console.error("Error sending itinerary:", error);
    throw error;
  }
}

async function sendInitialConfirmationToClient(reserva: Reserva) {
  try {
    const { error } = await resend.emails.send({
      from: "Sitios Interes México <admin@sitiosdeinteresmexico.com>",
      to: [String(reserva.email)],
      subject: "Recibimos tu reserva",
      text: `Hola! ${reserva.nombreCompleto},\n\nHemos recibido tu solicitud de reserva.\n\nEstamos procesando tu información y pronto recibirás actualizaciones.
      \n${reserva.Mensaje || "Sin mensaje adicional"}\n\nGracias por elegirnos.
      `,
    });

    if (error) {
      throw error;
    }
    console.log(`Initial email sent to ${reserva.email}`);
  } catch (error) {
    console.error("Error sending initial confirmation:", error);
  }
}

async function sendConfirmationEmail(reserva: Reserva, user_email: string) {
  console.log(typeof user_email, "RESERVA EMAIL type initial");
  console.log(user_email, "RESERVA EMAIL content");

  try {
    const { error } = await resend.emails.send({
      from: "Sitios Interes México <admin@sitiosdeinteresmexico.com>",
      to: [user_email],
      subject: "Confirmación de reservación",
      text: `¡Su reserva ha sido confirmada!
  
        Detalles de su reservación:
        ID: ${reserva.id}
        Fecha: ${reserva.Fecha ? new Date(reserva.Fecha).toLocaleDateString("es-MX") : "No especificado"}
        Participantes: ${reserva.personas || "No especificado"}
        
        ${reserva.Mensaje ? `Tu mensaje: ${reserva.Mensaje}\n\n` : ""}
        Pronto recibirá los documentos para firma electrónica.`,
      cc: [process.env.ADMIN_EMAIL || ""],
    });

    if (error) throw error;
    console.log(`Email de confirmación enviado a ${user_email}`);
  } catch (error) {
    console.error("Error al enviar email al cliente:", error);
  }
}

async function sendInitialNotificationToAdmin(reserva: Reserva) {
  try {
    if (!process.env.ADMIN_EMAIL) {
      throw new Error("ADMIN_EMAIL environment variable not set.");
    }
    console.log(
      "-------------\n\n-----------------\n\n-------------\nTESTING\n\n--------\nSending admin notification for booking DATA:\n\n",
      reserva
    );
    const { error } = await resend.emails.send({
      from: "Sitios Interes México <admin@sitiosdeinteresmexico.com>",
      to: [process.env.ADMIN_EMAIL],
      subject: "Nueva reservación creada",
      text: `Nueva reservación registrada:
        ID: ${reserva.id}
        Fecha del tour: ${reserva.Fecha || "No especificado"}
        Mensaje: ${reserva.Mensaje || "Sin mensaje adicional"}
        Confirmada: ${reserva.Confirmacion ? "Sí" : "No"}`,
    });

    if (error) {
      throw error;
    }
    console.log(`Admin notification sent for booking ${reserva.id}`);
  } catch (error) {
    console.error("Error sending email to admin:", error);
  }
}
