import * as pdfjsLib from "pdfjs-dist";
import { parseICICIMultiLineTransactions } from "./iciciParser";
import { parseIPPBTransactions } from "./ippbParser";
import { parsePNBTransactions } from "./pnbParser";
import { parseKotakTransactions } from "./kotakParser";
import { parseHdfcTransactions } from "./hdfcParser";
import { parseIndusIndTransactions } from "./indusindParser";
import { parseAxisTransactions } from "./axisParser"; // Import your Axis parser

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parsePDFFile(
  file,
  bankType = "icici",
  passwordCallback = null,
) {
  const startTime = performance.now();

  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  let loadingTask;

  try {
    loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      useSystemFonts: true,
    });

    // Handle password protected PDFs
    if (typeof passwordCallback === "function") {
      loadingTask.onPassword = async (updatePassword, reason) => {
        const message =
          reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD
            ? "Incorrect password. Please try again."
            : "This PDF is password protected.";

        try {
          const password = await passwordCallback(message);

          if (!password || password.trim() === "") {
            loadingTask.destroy();
            return;
          }

          updatePassword(password.trim());
        } catch (e) {
          loadingTask.destroy();
        }
      };
    }

    const pdf = await loadingTask.promise;

    let lines = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      // Include "indusind" and "axis" alongside coordinate-based row extractors to preserve tabular alignment properly
      if (
        bankType.toLowerCase() === "icici" ||
        bankType.toLowerCase() === "ippb"
      ) {
        const pageLines = textContent.items
          .map((item) => item.str)
          .join("\n")
          .split("\n");

        lines.push(...pageLines);
      } else {
        // ---------------------------------------
        // PNB / HDFC / IndusInd / Axis / others need row extraction
        // ---------------------------------------
        const rowsMap = {};

        for (const item of textContent.items) {
          const y = Math.round(item.transform[5] / 3) * 3;

          if (!rowsMap[y]) rowsMap[y] = [];

          rowsMap[y].push({
            x: item.transform[4],
            str: item.str,
          });
        }

        const sortedRows = Object.keys(rowsMap).sort(
          (a, b) => Number(b) - Number(a),
        );

        for (const y of sortedRows) {
          const row = rowsMap[y]
            .sort((a, b) => a.x - b.x)
            .map((i) => i.str)
            .join(" ")
            .trim();

          if (row) {
            lines.push(row);
          }
        }
      }
    }

    lines = lines.map((l) => l.trim()).filter(Boolean);

    let transactions = [];

    switch (bankType.toLowerCase()) {
      case "icici":
        transactions = parseICICIMultiLineTransactions(lines);
        break;

      case "ippb":
        transactions = parseIPPBTransactions(lines);
        break;

      case "pnb":
        transactions = parsePNBTransactions(lines);
        break;

      case "kotak":
        transactions = parseKotakTransactions(lines);
        break;

      case "hdfc":
        transactions = parseHdfcTransactions(lines);
        break;

      case "indusind":
        transactions = parseIndusIndTransactions(lines);
        break;

      case "axis":
        transactions = parseAxisTransactions(lines);
        break;

      case "sbi":
        throw new Error(
          `${bankType.toUpperCase()} parser is not implemented yet.`,
        );

      default:
        throw new Error(`Unsupported bank: ${bankType}`);
    }

    if (!transactions.length) {
      throw new Error("No transactions found.");
    }

    return transactions;
  } catch (err) {
    console.error(err);

    if (
      err?.name === "PasswordException" ||
      err?.message === "No password given"
    ) {
      if (!passwordCallback) {
        throw new Error("PDF_PASSWORD_REQUIRED");
      }
      throw err;
    }

    if (
      err?.message === "Worker was destroyed" ||
      err?.message === "PASSWORD_CANCELLED"
    ) {
      throw new Error("PASSWORD_CANCELLED");
    }

    throw err;
  }
}
