import { readFileSync } from "node:fs";
import { join } from "node:path";

export const TEST_APP_URLS = {
  localNew: "http://localhost:3000/decks/new",
  productionNew: "https://hkstudya.vercel.app/decks/new",
} as const;

/** Public pages fetch-url can read. Use these for URL ingest tests. */
export const TEST_WEB_URLS = {
  photosynthesis: "https://en.wikipedia.org/wiki/Photosynthesis",
  chloroplast: "https://en.wikipedia.org/wiki/Chloroplast",
} as const;

export const TEST_FIXTURE_FILES = {
  detailedPdf: "hk-dse-photosynthesis.pdf",
  scanPdf: "hk-dse-photosynthesis-scan.pdf",
  sampleText: "sample-notes.txt",
} as const;

export function fixturePath(name: string) {
  return join(process.cwd(), "tests/fixtures", name);
}

export function readFixture(name: string) {
  return new Uint8Array(readFileSync(fixturePath(name)));
}

/** DSE-style notes. Keep ASCII so Helvetica PDFs extract cleanly. */
export const DETAILED_STUDY_PAGES: string[][] = [
  [
    "HK DSE Biology — Photosynthesis (detailed test notes)",
    "",
    "1. Overview",
    "Photosynthesis converts light energy into chemical energy in green plants,",
    "algae, and some bacteria. Carbon dioxide and water become glucose and oxygen.",
    "Word equation: carbon dioxide + water -> glucose + oxygen (light, chlorophyll).",
    "",
    "2. Where it happens",
    "Leaf palisade cells are packed with chloroplasts. Chlorophyll a and b in the",
    "thylakoid membranes absorb red and blue light and reflect green.",
    "Stomata on the lower epidermis let CO2 in and O2 and water vapour out.",
    "Xylem brings water from roots. Phloem exports sugars as sucrose.",
    "",
    "3. Light-dependent stage (thylakoid / grana)",
    "Photolysis splits water: 2 H2O -> 4H+ + 4e- + O2. Electrons enter photosystem II,",
    "then photosystem I. NADP+ is reduced to NADPH. ATP is made by chemiosmosis",
    "through ATP synthase (photophosphorylation). Oxygen diffuses out via stomata.",
  ],
  [
    "4. Light-independent stage (Calvin cycle, stroma)",
    "Rubisco fixes CO2 onto ribulose bisphosphate (RuBP). The product is reduced",
    "using ATP and NADPH to triose phosphate. Some triose becomes glucose;",
    "the rest regenerates RuBP. Temperature, CO2 concentration, and light",
    "intensity can each limit the rate (limiting factors).",
    "",
    "5. Limiting factors (exam points)",
    "- Low light: fewer electrons and less ATP/NADPH, so Calvin cycle slows.",
    "- Low CO2: rubisco has less substrate; extra light cannot raise the rate.",
    "- Low temperature: enzyme (rubisco) collisions slow; rate falls.",
    "A graph of rate vs light rises then plateaus when CO2 or temperature limits.",
    "",
    "6. Adaptations of the leaf",
    "Broad lamina captures light. Thin blade shortens the diffusion path.",
    "Waxy cuticle cuts water loss. Air spaces in the spongy mesophyll hold CO2.",
    "Guard cells open stomata in light when photosynthesis uses CO2.",
  ],
  [
    "7. Compare respiration",
    "Photosynthesis stores energy; aerobic respiration in mitochondria releases it.",
    "In light, net gas exchange is O2 out and CO2 in. In the dark, only respiration.",
    "Compensation point: photosynthesis rate equals respiration rate.",
    "",
    "8. Common DSE mistakes",
    "Chlorophyll does not 'make' food by itself; it captures light for the reactions.",
    "Oxygen comes from water photolysis, not from carbon dioxide.",
    "Glucose is often converted to starch for storage or sucrose for transport.",
    "",
    "9. Quick check",
    "Name the two stages, the organelle, the pigment, the gas in, the gas out,",
    "and one limiting factor. Explain why a brightly lit sealed tube of pondweed",
    "produces bubbles faster when sodium hydrogencarbonate is added (more CO2).",
  ],
];
