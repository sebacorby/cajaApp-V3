import { readFile } from "node:fs/promises";

const bytes = await readFile(new URL("./salary-test-fetch.pdf", import.meta.url));
const file = new File([bytes], `salary-receipt-fetch-${Date.now()}.pdf`, { type: "application/pdf" });
const formData = new FormData();
formData.append("file", file);

console.log("posting at", new Date().toISOString());
const start = Date.now();
try {
  const response = await fetch("http://127.0.0.1:11436/api/salary-receipts/import", {
    method: "POST",
    body: formData,
  });
  console.log("status", response.status, "elapsedMs", Date.now() - start);
  const text = await response.text();
  console.log("body length", text.length);
} catch (error) {
  console.error("fetch error after", Date.now() - start, "ms:", error);
}
