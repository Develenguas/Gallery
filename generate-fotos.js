
const fs = require("fs");
const path = require("path");

const FOTOS_DIR = path.join(__dirname, "fotos");
const OUTPUT_FILE = path.join(__dirname, "data", "photos.json");
const VALID_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

function titleFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, "");
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function main() {
  if (!fs.existsSync(FOTOS_DIR)) {
    console.error('No existe la carpeta "fotos/". Créala y coloca tus imágenes ahí.');
    process.exit(1);
  }

  const files = fs
    .readdirSync(FOTOS_DIR)
    .filter((f) => VALID_EXT.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));

  if (files.length === 0) {
    console.warn('No se encontraron imágenes dentro de "fotos/". El álbum quedará vacío.');
  }

  const photos = files.map((file) => ({
    file: file,
    title: titleFromFilename(file),
  }));

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(photos, null, 2), "utf-8");

  console.log(`Listo. ${photos.length} foto(s) encontradas.`);
  console.log(`Se guardó en: ${path.relative(__dirname, OUTPUT_FILE)}`);
}

main();
