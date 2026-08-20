    const cartCount = document.getElementById('cart-count');

    function setCartCount(count) {
        const total = Number(count) || 0;
        cartCount.textContent = total;
        cartCount.classList.toggle('visible', total > 0);
    }

    setCartCount(0);

    const benefitsSlider = document.querySelector('.benefits');
    const benefits = document.querySelectorAll('.benefit');
    const benefitsDots = document.querySelectorAll('.benefits-dots button');

    if (benefitsSlider && benefits.length && benefitsDots.length) {
        function updateBenefitsDot() {
            const activeIndex = Math.round(benefitsSlider.scrollLeft / benefitsSlider.clientWidth);

            benefitsDots.forEach((dot, index) => {
                const isActive = index === activeIndex;
                dot.classList.toggle('active', isActive);

                if (isActive) {
                    dot.setAttribute('aria-current', 'true');
                } else {
                    dot.removeAttribute('aria-current');
                }
            });
        }

        benefitsDots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                benefitsSlider.scrollTo({
                    left: index * benefitsSlider.clientWidth,
                    behavior: 'smooth'
                });
            });
        });

        benefitsSlider.addEventListener('scroll', updateBenefitsDot, { passive: true });
    }

// Enlace oficial de tu Google Sheets en formato CSV
const sheetCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOrtb890NBzVIpObAuVqlxUvxQuqC68hrkHSgkfuWkZyqGHEgPmKf5Dw5mnIUN-ePUo2yQhzVuCehx/pub?gid=0&single=true&output=csv";

// Función para procesar y organizar las filas del documento Excel (CSV)
function parseCSV(text) {
    const rows = [];
    let row = [];
    let value = "";
    let insideQuotes = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];
        const nextCharacter = text[index + 1];

        if (character === '"' && insideQuotes && nextCharacter === '"') {
            value += '"';
            index++;
        } else if (character === '"') {
            insideQuotes = !insideQuotes;
        } else if (character === "," && !insideQuotes) {
            row.push(value.trim());
            value = "";
        } else if ((character === "\n" || character === "\r") && !insideQuotes) {
            if (character === "\r" && nextCharacter === "\n") index++;
            row.push(value.trim());
            if (row.some(cell => cell !== "")) rows.push(row);
            row = [];
            value = "";
        } else {
            value += character;
        }
    }

    row.push(value.trim());
    if (row.some(cell => cell !== "")) rows.push(row);
    if (rows.length === 0) return [];

    const headers = rows[0];
    return rows.slice(1).map(columns => {
        const product = {};
        headers.forEach((header, index) => {
            product[header] = columns[index] || "";
        });
        return product;
    });
}

async function getProducts() {
    console.log("Consultando productos desde Google Sheets...");
    
    try {
        const response = await fetch(sheetCsvUrl);
        const csvText = await response.text();
        const data = parseCSV(csvText);

        console.log("Productos recibidos con éxito:", data);

        // Seleccionamos las tarjetas que tienen el <span>$</span> fijo en el HTML
        const cards = document.querySelectorAll(".card-product");

        cards.forEach((card, index) => {
            const product = data[index];

            // Si el Excel no tiene información para esta tarjeta, la ocultamos de la pantalla
            if (!product) {
                card.style.display = "none";
                return;
            }

            // Rellenamos los datos de los textos e imágenes
            card.style.display = "block";
            card.querySelector("img").src = product.image || "images/cloud-upload-signal.svg";
            card.querySelector("img").alt = product.name || "alfombra";
            card.querySelector(".title-product").textContent = product.name || "";
            card.querySelector(".description-product").textContent = product.description || "";
            card.querySelector(".dimensions").textContent = product.dimensions || "";
            
            // Buscamos el párrafo del precio
            const priceParagraph = card.querySelector(".price");
            const spanSigno = priceParagraph.querySelector("span");

            if (product.price) {
                // Formateamos el número de forma limpia (ej: 120000 -> 120.000)
                const numeroFormateado = Number(product.price).toLocaleString("es-CO");
                
                // Inserta el número justo después del <span>$</span> sin romper nada
                spanSigno.insertAdjacentText("afterend", numeroFormateado);
            } else {
                priceParagraph.textContent = "Consultar precio";
            }
        });

    } catch (error) {
        console.error("Error al cargar el catálogo desde el Excel:", error);
    }
}

// Carga los productos automáticamente al abrir la página
window.addEventListener("DOMContentLoaded", () => {
    getProducts();
});

