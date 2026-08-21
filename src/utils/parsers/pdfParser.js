import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function parsePDFFile(
  file,
  bankType = "axis",
  passwordCallback = null,
) {
  const startTime = performance.now();

  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);

  let loadingTask;
  let resolvedPassword = "";

  try {
    loadingTask = pdfjsLib.getDocument({
      data: typedArray,
      useSystemFonts: true,
    });

    // Handle password protected PDFs via popup callback
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

    // Trigger pdfjs loader to prompt password modal if required
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

  // Dispatch authenticated request to backend parser API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bankType", bankType);
  if (resolvedPassword) {
    formData.append("password", resolvedPassword);
  }

  const response = await fetch("https://bank-statement-summary-backend.vercel.app/parse-pdf", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data.message || data.error || "Failed to parse PDF on server.",
    );
  }

  // Return the resolvedPassword so subsequent metadata calls can reuse it
  return {
    ...data,
    _unlockedPassword: resolvedPassword,
  };
}
