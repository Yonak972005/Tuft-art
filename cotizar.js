const quoteForm = document.getElementById("quote-form");
const imageInput = document.getElementById("design-image");
const imagePreview = document.getElementById("image-preview");
const statusMessage = document.getElementById("quote-status");

// Este archivo solo se carga en cotizar.html; evita fallos si se reutiliza en otra página.
if (!quoteForm || !imageInput || !imagePreview || !statusMessage) {
    throw new Error("Faltan elementos del formulario de cotización.");
}

function getQuoteData() {
    const formData = new FormData(quoteForm);
    return {
        name: formData.get("customerName").trim(),
        email: formData.get("customerEmail").trim(),
        phone: formData.get("customerPhone").trim(),
        message: formData.get("message").trim()
    };
}

function validateContactData(data) {
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email);
    if (!emailIsValid) {
        return "Escribe un correo electrónico válido.";
    }

    const normalizedPhone = data.phone.replace(/[\s()-]/g, "");
    if (!/^(?:\+?57)?3\d{9}$/.test(normalizedPhone)) {
        return "Escribe un teléfono colombiano válido de 10 dígitos.";
    }

    return "";
}

function validateImage(file) {
    // La dimensión se verifica en el navegador antes de enviar el archivo al servidor.
    return new Promise((resolve, reject) => {
        if (!file) {
            reject("Selecciona una imagen para enviarla por correo.");
            return;
        }

        const validTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            reject("La imagen debe estar en formato JPG, PNG o WebP.");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            reject("La imagen no puede superar los 10 MB.");
            return;
        }

        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        image.addEventListener("load", () => {
            URL.revokeObjectURL(objectUrl);
            if (image.width < 1200 || image.height < 1200) {
                reject("La imagen debe tener como mínimo 1200 x 1200 píxeles.");
                return;
            }
            resolve();
        });
        image.addEventListener("error", () => {
            URL.revokeObjectURL(objectUrl);
            reject("No se pudo leer la imagen seleccionada.");
        });
        image.src = objectUrl;
    });
}

imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    validateImage(file).catch((error) => {
        imageInput.value = "";
        imagePreview.textContent = "Selecciona una imagen";
        statusMessage.textContent = error;
    });
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        imagePreview.innerHTML = `<img src="${reader.result}" alt="Vista previa del diseño seleccionado">`;
    });
    reader.readAsDataURL(file);
});

quoteForm.addEventListener("submit", async (event) => {
    // El servidor repite estas validaciones; la validación del cliente solo mejora la respuesta.
    event.preventDefault();
    if (!quoteForm.reportValidity()) return;
    const data = getQuoteData();
    const contactError = validateContactData(data);
    if (contactError) {
        statusMessage.textContent = contactError;
        return;
    }

    const file = imageInput.files[0];
    try {
        await validateImage(file);
    } catch (error) {
        statusMessage.textContent = error;
        return;
    }

    const formData = new FormData(quoteForm);
    statusMessage.textContent = "Enviando la cotización...";

    try {
        const response = await fetch("/api/quote", {
            method: "POST",
            body: formData
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "No se pudo enviar la cotización.");
        statusMessage.textContent = "Cotización enviada correctamente por correo y WhatsApp.";
        quoteForm.reset();
        imagePreview.textContent = "Selecciona una imagen";
    } catch (error) {
        statusMessage.textContent = error.message;
    }
});
