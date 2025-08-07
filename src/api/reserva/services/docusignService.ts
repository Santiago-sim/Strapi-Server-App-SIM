// src/services/docusignService.ts
import docusign from 'docusign-esign';

export const sendDocumentForSigning = async (
  email: string,
  documentUrl: string
): Promise<string> => {
  const apiClient = new docusign.ApiClient();
  apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
  apiClient.addDefaultHeader(
    "Authorization",
    `Bearer ${process.env.DOCUSIGN_ACCESS_TOKEN}`
  );

  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  
  const envelopeDefinition: docusign.EnvelopeDefinition = {
    emailSubject: "Por favor firme su documento de reserva",
    recipients: {
      signers: [{
        email: email,
        name: "Cliente",
        recipientId: "1"
      }]
    },
    documents: [{
      documentBase64: Buffer.from(documentUrl).toString("base64"),
      name: "Contrato de Reserva",
      fileExtension: "pdf",
      documentId: "1"
    }],
    status: "sent"
  };

  try {
    const envelope = await envelopesApi.createEnvelope(
      process.env.DOCUSIGN_ACCOUNT_ID!,
      { envelopeDefinition }
    );
    return envelope.envelopeId;
  } catch (error) {
    console.error("Error en DocuSign:", error);
    throw error;
  }
};