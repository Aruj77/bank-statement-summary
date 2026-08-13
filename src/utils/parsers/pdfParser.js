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

    // Handle password protected PDFs via popup callback first
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

    // Attempt to load the PDF purely to trigger the password popup if needed
    await loadingTask.promise;
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

    // If it failed for other reasons, we can still let the backend try or throw
  }

  // Once password is authenticated via popup (or if none was needed), send file & password to backend API
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bankType", bankType);
  formData.append("password", resolvedPassword);

  const response = await fetch("https://bank-statement-summary-backend.vercel.app/parse-pdf", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to parse PDF on server.");
  }
  return data;
}
