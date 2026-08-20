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
const sheetCsvUrl = "https://google.com";

// Función mejorada y robusta para procesar el archivo del Excel (CSV)
function parseCSV(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    // Leemos los encabezados de la primera fila
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        if (!currentLine) continue; 
        
        // Separamos por comas de forma inteligente para no romper textos con espacios
        const row = [];
        let insideQuotes = false;
        let entries = "";
        
        for (let j = 0; j < currentLine.length; j++) {
            let char = currentLine[j];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                row.push(entries.trim().replace(/^"|"$/g, ''));
                entries = "";
            } else {
                entries += char;
            }
        }
        row.push(entries.trim().replace(/^"|"$/g, ''));

        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || "";
        });
        result.push(obj);
    }
    return result;
}

async function getProducts() {
    console.log("Consultando productos desde Google Sheets...");
    
    try {
        const response = await fetch(sheetCsvUrl);
        const csvText = await response.text();
        const data = parseCSV(csvText);

        console.log("Productos recibidos con éxito:", data);

        // Seleccionamos las 5 tarjetas del HTML
        const cards = document.querySelectorAll(".card-product");

        cards.forEach((card, index) => {
            const product = data[index];

            // Si el Excel no tiene información para esta tarjeta, la ocultamos
            if (!product) {
                card.style.display = "none";
                return;
            }

            card.style.display = "block";
            card.querySelector("img").src = product.image || "images/cloud-upload-signal.svg";
            card.querySelector("img").alt = product.name || "alfombra";
            
            // Usamos textContent de forma segura para nombres completos
            card.querySelector(".title-product").textContent = product.name || "";
            card.querySelector(".description-product").textContent = product.description || "";
            card.querySelector(".dimensions").textContent = product.dimensions || "";
            
            // Buscamos el párrafo del precio
            const priceParagraph = card.querySelector(".price");
            const spanSigno = priceParagraph.querySelector("span");

            // Limpiamos cualquier precio numérico anterior si GitHub recarga el script
            const nodosTexto = Array.from(priceParagraph.childNodes);
            nodosTexto.forEach(nodo => {
                if (nodo !== spanSigno) {
                    nodo.remove();
                }
            });

            if (product.price) {
                const numeroFormateado = Number(product.price).toLocaleString("es-CO");
                spanSigno.insertAdjacentText("afterend", numeroFormateado);
            } else {
                priceParagraph.textContent = "Consultar precio";
            }
        });

    } catch (error) {
        console.error("Error al cargar el catálogo desde el Excel:", error);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    getProducts();
});

