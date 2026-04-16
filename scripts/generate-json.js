import fetch from "node-fetch";
import fs from "fs";
import { parse } from "csv-parse/sync";

/**
 * -------- CONFIG --------
 */
const CSV_URL = process.env.CSV_URL;
if (!CSV_URL) {
  throw new Error("CSV_URL manquant");
}

/**
 * -------- DATE (QUÉBEC) --------
 */
const today = new Date(
  new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
);
const day = today.getDate();

/**
 * -------- HELPERS --------
 */
const normalize = (value) =>
  String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();

/**
 * -------- MAIN --------
 */
const run = async () => {
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(`Erreur téléchargement CSV (${res.status})`);
  }

  const csvText = await res.text();
  const records = parse(csvText, { skip_empty_lines: true });

  if (!records.length) {
    throw new Error("CSV vide");
  }

  /**
   * 1. Trouver la vraie ligne d’en‑têtes
   */
  let headers = null;
  let headerIndex = -1;

  for (let i = 0; i < records.length; i++) {
    const row = records[i].map(normalize);

    const hasJour = row.includes("JOUR");
    const hasLune = row.includes("LUNE");
    const hasBelier = row.includes("BELIER");

    if (hasJour && hasLune && hasBelier) {
      headers = records[i];
      headerIndex = i;
      break;
    }
  }

  if (!headers) {
    throw new Error("Impossible de détecter une ligne d’en-têtes valide");
  }

  const dataRows = records.slice(headerIndex + 1);

  const col = (name) =>
    headers.findIndex((h) => normalize(h) === name);

  /**
   * 2. Construire lignes valides
   */
  const validRows = dataRows
    .map((r) => ({
      jour: Number(r[col("JOUR")]),
      row: r
    }))
    .filter((r) => !isNaN(r.jour));

  const selected = validRows
    .filter((r) => r.jour <= day)
    .sort((a, b) => b.jour - a.jour)[0];

  if (!selected) {
    throw new Error("Aucune ligne exploitable pour aujourd’hui");
  }

  const row = selected.row;

  /**
   * 3. JSON final
   */
  const json = {
    date: today.toISOString().split("T")[0],
    day_label: today.toLocaleDateString("fr-CA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }),
    lune: row[col("LUNE")],
    signes: {
      belier: row[col("BELIER")],
      taureau: row[col("TAUREAU")],
      gemeaux: row[col("GEMEAUX")],
      cancer: row[col("CANCER")],
      lion: row[col("LION")],
      vierge: row[col("VIERGE")],
      balance: row[col("BALANCE")],
      scorpion: row[col("SCORPION")],
      sagittaire: row[col("SAGITTAIRE")],
      capricorne: row[col("CAPRICORNE")],
      verseau: row[col("VERSEAU")],
      poissons: row[col("POISSONS")]
    }
  };

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/horoscope.json",
    JSON.stringify(json, null, 2)
  );

  console.log("JSON généré avec succès");
};

run();
