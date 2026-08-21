const sheetCsvUrl = "productos.csv";

// Convierte el CSV en objetos, respetando campos entre comillas y saltos de línea.
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

    const headers = rows[0].map(header => header.trim());
    return rows.slice(1).map(columns => {
        const product = {};
        headers.forEach((header, index) => {
            product[header] = columns[index] || "";
        });
        return product;
    });
}

function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "card-product";

    const image = document.createElement("img");
    image.src = product.image || "images/cloud-upload-signal.svg";
    image.alt = product.name || "Alfombra";

    const details = document.createElement("div");
    details.innerHTML = `
        <h3 class="title-product"></h3>
        <p class="description-product"></p>
        <p class="dimensions"></p>
        <p class="price"></p>
    `;
    details.querySelector(".title-product").textContent = product.name;
    details.querySelector(".description-product").textContent = product.description;
    details.querySelector(".dimensions").textContent = product.dimensions;

    const price = details.querySelector(".price");
    price.textContent = product.price
        ? `$${Number(product.price).toLocaleString("es-CO")}`
        : "Consultar precio";

    card.append(image, details);
    return card;
}

async function loadProducts() {
    const productsContainer = document.querySelector(".products");
    if (!productsContainer) return;

    try {
        const response = await fetch(`${sheetCsvUrl}?v=${Date.now()}`, {
            cache: "no-store"
        });
        if (!response.ok) {
            throw new Error(`No se pudo cargar el catálogo (${response.status})`);
        }
        const data = parseCSV(await response.text());
        // Inicio limita la cantidad con data-limit; catálogo no establece límite.
        const limit = Number(productsContainer.dataset.limit) || data.length;
        const fragment = document.createDocumentFragment();
        data.slice(0, limit).forEach(product => fragment.append(createProductCard(product)));
        productsContainer.replaceChildren(fragment);
    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
        productsContainer.textContent = "No se pudo cargar el catálogo.";
    }
}

function setupMenu() {
    const menuToggle = document.querySelector(".menu-toggle");
    const mobileNav = document.querySelector(".navbar-mobile");
    if (!menuToggle || !mobileNav) return;

    const closeMenu = () => {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Abrir menú");
    };
    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
    });
    mobileNav.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("click", event => {
        if (!mobileNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeMenu();
    });
}

function setupBenefitsSlider() {
    const slider = document.querySelector(".benefits");
    const dots = document.querySelectorAll(".benefits-dots button");
    if (!slider || !dots.length) return;

    const updateDots = () => {
        const activeIndex = Math.round(slider.scrollLeft / slider.clientWidth);
        dots.forEach((dot, index) => {
            dot.classList.toggle("active", index === activeIndex);
            dot.toggleAttribute("aria-current", index === activeIndex);
        });
    };
    dots.forEach((dot, index) => dot.addEventListener("click", () => slider.scrollTo({
        left: index * slider.clientWidth,
        behavior: "smooth"
    })));
    slider.addEventListener("scroll", updateDots, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
    setupMenu();
    setupBenefitsSlider();
    loadProducts();
});

