import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const BACKEND_BASE_URL = "http://localhost:5000";

export async function parsePDFFile(
  file,
  bankType = "axis",
  passwordCallback = null,
) {
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  let loadingTask;
  let resolvedPassword = "";

  try {
    loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      useSystemFonts: true,
    });

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

          resolvedPassword = password.trim();
          updatePassword(resolvedPassword);
        } catch (e) {
          loadingTask.destroy();
        }
      };
    }

    await loadingTask.promise;
  } catch (err) {
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
  }

  // 1. Prepare Form Data for PDF parsing
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bankType", bankType);
  if (resolvedPassword) {
    formData.append("password", resolvedPassword);
  }

  // 2. Prepare Form Data for Metadata extraction
  const metaFormData = new FormData();
  metaFormData.append("file", file);
  if (resolvedPassword) {
    metaFormData.append("password", resolvedPassword);
  }

  // Execute both Parse PDF and Extract Metadata in parallel
  const [statementResponse, metadataResponse] = await Promise.allSettled([
    fetch(`${BACKEND_BASE_URL}/parse-pdf`, {
      method: "POST",
      body: formData,
    }),
    fetch(`${BACKEND_BASE_URL}/api/extract-metadata`, {
      method: "POST",
      body: metaFormData,
    }),
  ]);

  // Handle Statement Response
  let statementData = {};
  if (statementResponse.status === "fulfilled" && statementResponse.value.ok) {
    statementData = await statementResponse.value.json();
  } else {
    const errorPayload =
      statementResponse.status === "fulfilled"
        ? await statementResponse.value.json().catch(() => ({}))
        : {};
    throw new Error(
      errorPayload.message ||
        errorPayload.error ||
        "Failed to parse PDF statement on server.",
    );
  }

  // Handle Metadata Response
  let metadata = {};
  if (metadataResponse.status === "fulfilled" && metadataResponse.value.ok) {
    try {
      const json = await metadataResponse.value.json();
      metadata = json?.data || json;
    } catch (e) {
      console.warn("Could not parse metadata JSON:", e);
    }
  }

  // Normalize transactions list
  let transactions = [];
  if (Array.isArray(statementData)) {
    transactions = statementData;
  } else if (Array.isArray(statementData?.transactions)) {
    transactions = statementData.transactions;
  } else if (Array.isArray(statementData?.data?.transactions)) {
    transactions = statementData.data.transactions;
  }

  // Unified Response
  return {
    ...statementData,
    transactions,
    metadata,
    bankName: metadata?.bankName || statementData?.bank || "Detected Bank",
    accountNumber:
      metadata?.accountNumber || statementData?.accountNumber || null,
    accountHolder:
      metadata?.accountHolder || statementData?.accountHolder || null,
    accountType: metadata?.accountType || statementData?.accountType || null,
    ifscCode: metadata?.ifscCode || null,
    micrCode: metadata?.micrCode || null,
    branch: metadata?.branch || null,
    address: metadata?.address || null,
    panNumber: metadata?.panNumber || null,
    cifNumber: metadata?.cifNumber || null,
    statementPeriod: metadata?.statementPeriod || null,
    openingBalance:
      metadata?.openingBalance ||
      statementData?.summary?.openingBalance ||
      null,
    closingBalance:
      metadata?.closingBalance ||
      statementData?.summary?.closingBalance ||
      null,
    resolvedPassword,
  };
}
