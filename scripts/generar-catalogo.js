import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const csvPath = path.join(projectRoot, "productos.csv");

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
    if (rows.length < 2) return [];

    const headers = rows[0].map(header => header.trim());
    return rows.slice(1).map(columns => Object.fromEntries(
        headers.map((header, index) => [header, columns[index] || ""])
    ));
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>\"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);
}

function renderProduct(product) {
    const numericPrice = Number(product.price);
    const price = Number.isFinite(numericPrice) && numericPrice >= 0
        ? `$${numericPrice.toLocaleString("es-CO")}`
        : "Consultar precio";

    return `    <article class="card-product">
        <img src="${escapeHtml(product.image || "images/cloud-upload-signal.svg")}" alt="${escapeHtml(product.name || "Alfombra")}" loading="lazy">
        <div>
            <h3 class="title-product">${escapeHtml(product.name)}</h3>
            <p class="description-product">${escapeHtml(product.description)}</p>
            <p class="dimensions">${escapeHtml(product.dimensions)}</p>
            <p class="price">${price}</p>
        </div>
    </article>`;
}

function updatePage(filename, products, limit) {
    const filePath = path.join(projectRoot, filename);
    const html = fs.readFileSync(filePath, "utf8");
    const startMarker = "<!-- PRODUCTS_START -->";
    const endMarker = "<!-- PRODUCTS_END -->";
    const start = html.indexOf(startMarker);
    const end = html.indexOf(endMarker);

    if (start === -1 || end === -1 || end < start) {
        throw new Error(`No se encontraron las marcas de productos en ${filename}.`);
    }

    const cards = products.slice(0, limit).map(renderProduct).join("\n\n");
    const contentStart = start + startMarker.length;
    const updated = `${html.slice(0, contentStart)}\n${cards}\n${html.slice(end)}`;
    fs.writeFileSync(filePath, updated);
}

const products = parseCSV(fs.readFileSync(csvPath, "utf8"));
if (products.length === 0) throw new Error("productos.csv no contiene productos válidos.");

updatePage("index.html", products, 5);
updatePage("productos.html", products, products.length);
console.log(`Catálogo generado: ${Math.min(products.length, 5)} productos en inicio y ${products.length} en catálogo.`);
