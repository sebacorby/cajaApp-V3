import { test, expect } from "@playwright/test";

test("AI terminal state diagnostic v2", async ({ page, request }) => {
  test.setTimeout(200_000)

  const startTime = Date.now()
  console.log(`[DIAG2] Start: ${new Date(startTime).toISOString()}`)

  // Capture all network events
  const networkEvents: any[] = []
  page.on("request", (req) => {
    if (req.url().includes("ai-advisor")) {
      networkEvents.push({
        type: "request",
        url: req.url(),
        method: req.method(),
        timestamp: Date.now() - startTime,
      })
    }
  })

  page.on("response", (resp) => {
    if (resp.url().includes("ai-advisor")) {
      networkEvents.push({
        type: "response",
        url: resp.url(),
        status: resp.status(),
        timestamp: Date.now() - startTime,
      })
    }
  })

  page.on("requestfailed", (req) => {
    if (req.url().includes("ai-advisor")) {
      networkEvents.push({
        type: "requestfailed",
        url: req.url(),
        failure: req.failure()?.errorText,
        timestamp: Date.now() - startTime,
      })
    }
  })

  page.on("console", (msg) => {
    console.log(`[DIAG2][${Date.now() - startTime}ms][${msg.type()}] ${msg.text()}`)
  })

  // Setup UAT data
  const today = new Date().toISOString().split("T")[0]
  const movementIds: string[] = []

  try {
    for (const payload of [
      { type: "income", description: `Diag income ${Date.now()}`, amount: "100000,00" },
      { type: "expense", description: `Diag expense ${Date.now()}`, amount: "25000,00" },
    ]) {
      const r = await request.post(`http://127.0.0.1:11436/api/movements/manual`, {
        data: { occurredOn: today, sourceType: "manual_cash", categoryId: null, currency: "ARS", status: "actual", notes: "DIAG", ...payload },
      })
      expect(r.ok()).toBeTruthy()
      const j = await r.json()
      movementIds.push(j.sourceId)
    }

    console.log(`[DIAG2] ${Date.now() - startTime}ms: Navigating to Asesor IA`)
    await page.goto("http://127.0.0.1:11437/")
    await page.getByRole("button", { name: "Asesor IA", exact: true }).click()
    await expect(page.getByTestId("ai-advisor-section")).toBeVisible()
    await expect(page.getByTestId("ai-advisor-context-summary")).toBeVisible()
    console.log(`[DIAG2] ${Date.now() - startTime}ms: Section visible`)

    // Check button state before submit
    const submitBtn = page.getByTestId("ai-advisor-submit")
    const isDisabled = await submitBtn.isDisabled()
    console.log(`[DIAG2] ${Date.now() - startTime}ms: Submit button disabled? ${isDisabled}`)

    await page.getByTestId("ai-advisor-question").fill("Explica brevemente qué muestra el panel.")
    await page.waitForTimeout(500)

    const isDisabledAfter = await submitBtn.isDisabled()
    console.log(`[DIAG2] ${Date.now() - startTime}ms: Submit disabled after fill? ${isDisabledAfter}`)

    const submitStart = Date.now()
    console.log(`[DIAG2] ${Date.now() - startTime}ms: Click submit`)
    await submitBtn.click()

    console.log(`[DIAG2] ${Date.now() - startTime}ms: After click, waiting for response...`)
    console.log(`[DIAG2] Network events so far: ${networkEvents.length}`)

    const uiResponse = page.getByTestId("ai-advisor-response")
    try {
      await expect(uiResponse).toBeVisible({ timeout: 180_000 })
      const uiTime = Date.now() - submitStart
      const interactionId = await uiResponse.getAttribute("data-interaction-id")
      console.log(`[DIAG2] ${Date.now() - startTime}ms: Response visible after ${uiTime}ms, interactionId=${interactionId}`)
    } catch (e) {
      const failTime = Date.now() - submitStart
      console.log(`[DIAG2] ${Date.now() - startTime}ms: TIMEOUT after ${failTime}ms`)
      console.log(`[DIAG2] Network events at timeout: ${networkEvents.length}`)
      for (const ev of networkEvents) {
        console.log(`[DIAG2]   ${ev.type} ${ev.method || ""} ${ev.url} status=${ev.status || ""} failure=${ev.failure || ""} @${ev.timestamp}ms`)
      }
      throw e
    }
  } finally {
    for (const id of movementIds) {
      await request.delete(`http://127.0.0.1:11436/api/movements/manual/${id}`)
    }
  }
})
