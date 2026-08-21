import Busboy from "busboy";

export const config = {
    api: {
        bodyParser: false
    }
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_IMAGE_SIZE = 1200;
const MAX_MESSAGE_LENGTH = 500;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Lee dimensiones básicas sin guardar la imagen en disco ni depender de un conversor externo.
function getImageDimensions(buffer, mimeType) {
    if (mimeType === "image/png" && buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
        return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    }

    if (mimeType === "image/webp" && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
        if (buffer.toString("ascii", 12, 16) === "VP8X") {
            return {
                width: 1 + buffer.readUIntLE(24, 3),
                height: 1 + buffer.readUIntLE(27, 3)
            };
        }
    }

    if (mimeType === "image/jpeg" && buffer.readUInt16BE(0) === 0xffd8) {
        let offset = 2;
        while (offset + 9 < buffer.length) {
            if (buffer[offset] !== 0xff) {
                offset++;
                continue;
            }
            if (offset + 3 >= buffer.length) return null;
            const marker = buffer[offset + 1];
            const segmentLength = buffer.readUInt16BE(offset + 2);
            if (segmentLength < 2 || offset + segmentLength + 2 > buffer.length) return null;
            if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
                return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
            }
            offset += segmentLength + 2;
        }
    }

    return null;
}

function parseMultipart(request) {
    // Busboy procesa la carga multipart en streaming y limita el tamaño del archivo.
    return new Promise((resolve, reject) => {
        const contentType = request.headers["content-type"];
        const busboy = Busboy({ headers: { "content-type": contentType }, limits: { fileSize: MAX_FILE_SIZE } });
        const fields = {};
        let image = null;
        let fileTooLarge = false;

        busboy.on("field", (name, value) => {
            fields[name] = value.trim();
        });

        busboy.on("file", (name, stream, info) => {
            if (name !== "designImage") {
                stream.resume();
                return;
            }

            const chunks = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("limit", () => {
                fileTooLarge = true;
            });
            stream.on("end", () => {
                image = { buffer: Buffer.concat(chunks), filename: info.filename, mimeType: info.mimeType };
            });
        });

        busboy.on("error", reject);
        busboy.on("finish", () => resolve({ fields, image, fileTooLarge }));
        request.pipe(busboy);
    });
}

function validateRequest(fields, image) {
    if (!fields.customerName || !fields.customerEmail || !fields.customerPhone || !fields.message || !image) {
        return "Todos los datos y la imagen son obligatorios.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.customerEmail)) {
        return "El correo no es válido.";
    }

    const phone = fields.customerPhone.replace(/[\s()-]/g, "");
    if (!/^(?:\+?57)?3\d{9}$/.test(phone)) {
        return "El teléfono colombiano no es válido.";
    }

    if (fields.message.length > MAX_MESSAGE_LENGTH) {
        return "La idea no puede superar los 500 caracteres.";
    }

    if (!ALLOWED_TYPES.has(image.mimeType)) {
        return "La imagen debe ser JPG, PNG o WebP.";
    }

    if (image.buffer.length > MAX_FILE_SIZE) {
        return "La imagen no puede superar los 10 MB.";
    }

    const dimensions = getImageDimensions(image.buffer, image.mimeType);
    if (!dimensions) {
        return "No se pudo leer la imagen o su formato no es compatible.";
    }
    if (dimensions.width < MIN_IMAGE_SIZE || dimensions.height < MIN_IMAGE_SIZE) {
        return "La imagen debe tener como mínimo 1200 x 1200 píxeles.";
    }

    return null;
}

function buildMessage(fields) {
    return [
        "Hola, quiero cotizar una alfombra.",
        "",
        `Nombre: ${fields.customerName}`,
        `Correo: ${fields.customerEmail}`,
        `Teléfono: ${fields.customerPhone}`,
        `Idea: ${fields.message}`
    ].join("\n");
}

async function sendEmail(fields, image) {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL,
            to: [process.env.QUOTE_EMAIL_TO],
            subject: `Cotización de alfombra - ${fields.customerName}`,
            text: `${buildMessage(fields)}\n\nImagen adjunta: ${image.filename}`,
            attachments: [{
                filename: image.filename,
                content: image.buffer.toString("base64")
            }]
        })
    });

    if (!response.ok) throw new Error("No se pudo enviar el correo.");
}

async function sendWhatsApp(message) {
    const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to: process.env.WHATSAPP_TO,
            type: "text",
            text: { body: message }
        })
    });

    if (!response.ok) throw new Error("No se pudo enviar WhatsApp.");
}

export default async function handler(request, response) {
    // Punto de entrada de Vercel: valida la petición y notifica por ambos canales.
    if (request.method !== "POST") {
        response.status(405).json({ error: "Método no permitido." });
        return;
    }

    try {
        const { fields, image, fileTooLarge } = await parseMultipart(request);
        if (fileTooLarge) {
            response.status(400).json({ error: "La imagen no puede superar los 10 MB." });
            return;
        }

        const validationError = validateRequest(fields, image);
        if (validationError) {
            response.status(400).json({ error: validationError });
            return;
        }

        const message = buildMessage(fields);
        await Promise.all([sendEmail(fields, image), sendWhatsApp(message)]);
        response.status(200).json({ ok: true });
    } catch (error) {
        console.error(error);
        response.status(502).json({ error: "No se pudo completar la cotización. Intenta nuevamente." });
    }
}
