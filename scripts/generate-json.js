import fetch from "node-fetch";
import fs from "fs";
import { parse } from "csv-parse/sync";

/**
 * ----- CONFIGURATION -----
 * CSV_URL est fourni via GitHub Secrets
 */
const CSV_URL = process.env.CSV_URL;
if (!CSV_URL) {
  throw new Error("CSV_URL manquant");
}

/**
 * ----- DATE DU JOUR (FUSEAU QUÉBEC) -----
 */
const today = new Date(
  new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
);
const day = today.getDate();
const year = today.getFullYear();
const month = today
  .toLocaleDateString("fr-CA", { month: "long" })
  .toUpperCase();

/**
 * Nom logique de l’onglet (informationnelle)
 * ex. "AVRIL 2026"
 */
const SHEET_NAME = `${month} ${year}`;

/**
 * ----- SCRIPT PRINCIPAL -----
 */
const run = async () => {
  // 1. Télécharger le CSV
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    throw new Error(`Erreur lors du téléchargement du CSV (${res.status})`);
  }
  const csvText = await res.text();

  // 2. Parser le CSV
  const records = parse(csvText, {
    skip_empty_lines: true
  });

  if (!records.length) {
    throw new Error("CSV vide ou illisible");
  }

  const headers = records[0];
  const rows = records.slice(1);

  // Fonction utilitaire pour retrouver l’index d’une colonne
  const col = (name) => headers.indexOf(name);

  // Vérifications minimales
  if (col("JOUR") === -1 || col("LUNE") === -1) {
    throw new Error("Colonnes JOUR ou LUNE introuvables dans le CSV");
  }

  /**
   * 3. Sélection robuste de la ligne du jour
   *    → dernière ligne valide dont JOUR <= aujourd’hui
   */
  const validRows = rows
    .map(r => ({
      jour: Number(r[col("JOUR")]),
      row: r
    }))
    .filter(r => !isNaN(r.jour));

  const todayRow = validRows
    .filter(r => r.jour <= day)
    .sort((a, b) => b.jour - a.jour)[0];

  if (!todayRow) {
    throw new Error("Aucune donnée valide pour aujourd’hui ou avant");
  }

  const row = todayRow.row;

  /**
   * 4. Construction du JSON final
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
      belier: row[col("BÉLIER")],
      taureau: row[col("TAUREAU")],
      gemeaux: row[col("GÉMEAUX")],
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

  /**
   * 5. Écriture du fichier public JSON
   */
  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/horoscope.json",
    JSON.stringify(json, null, 2)
  );

  console.log(`Horoscope généré pour ${json.day_label} (${SHEET_NAME})`);
};

// Exécution
run();
