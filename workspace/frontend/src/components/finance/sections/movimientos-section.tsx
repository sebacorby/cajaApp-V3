"use client";

import { useEffect } from "react";
import { MovimientosSection as BaseMovimientosSection } from "./movimientos-section.base";

function isMovementEditor(sheet: HTMLElement): boolean {
  const title = sheet.querySelector<HTMLElement>("[data-slot='sheet-title']")?.textContent?.trim() ?? "";
  return title === "Nuevo movimiento" || title === "Editar movimiento";
}

function polishMovementSheet() {
  for (const sheet of Array.from(document.querySelectorAll<HTMLElement>("[data-slot='sheet-content']"))) {
    if (!isMovementEditor(sheet)) continue;

    sheet.style.padding = "1.5rem";
    sheet.style.gap = "1.25rem";

    const header = sheet.querySelector<HTMLElement>("[data-slot='sheet-header']");
    if (header) {
      header.style.padding = "0";
      header.style.paddingRight = "2rem";
    }

    const form = sheet.querySelector<HTMLFormElement>("form");
    if (form) {
      form.style.paddingLeft = "0";
      form.style.paddingRight = "0";
    }

    const footer = sheet.querySelector<HTMLElement>("[data-slot='sheet-footer']");
    if (footer) {
      footer.style.padding = "1rem 0 0";
    }

    const closeButton = Array.from(sheet.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      Array.from(button.querySelectorAll("span")).some((span) => span.textContent?.trim() === "Close"),
    );
    if (closeButton) {
      closeButton.style.top = "1.5rem";
      closeButton.style.right = "1.5rem";
    }
  }
}

export function MovimientosSection() {
  useEffect(() => {
    polishMovementSheet();
    const observer = new MutationObserver(polishMovementSheet);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <BaseMovimientosSection />;
}
