import fetch from "node-fetch";
import fs from "fs";
import { parse } from "csv-parse/sync";

const CSV_URL = process.env.CSV_URL;

if (!CSV_URL) {
  throw new Error("CSV_URL manquant");
}

const today = new Date();
const day = today.getDate();
const year = today.getFullYear();
const month = today
  .toLocaleDateString("fr-CA", { month: "long" })
  .toUpperCase();

const SHEET_NAME = `${month} ${year}`;

const run = async () => {
  const res = await fetch(CSV_URL);
  const csvText = await res.text();

  const records = parse(csvText, {
    skip_empty_lines: true
  });

  const headers = records[0];
  const rows = records.slice(1);

  const col = (name) => headers.indexOf(name);

  const row = rows.find(
    r => Number(r[col("JOUR")]) === day
  );

  if (!row) {
    throw new Error("Aucune ligne pour le jour courant");
  }

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

  fs.mkdirSync("public", { recursive: true });
  fs.writeFileSync(
    "public/horoscope.json",
    JSON.stringify(json, null, 2)
  );
};

run();
