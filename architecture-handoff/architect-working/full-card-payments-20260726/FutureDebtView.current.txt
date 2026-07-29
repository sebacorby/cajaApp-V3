"use client";

import { useEffect, useRef, useState } from "react";
import { FutureDebtView as FutureDebtViewCore } from "./FutureDebtViewCore";

type ButtonPosition = {
  top: number;
  right: number;
  height: number;
};

const DUPLICATE_SECTION_LABEL = "CUOTAS, COMPROMISOS E INGRESOS PROYECTADOS";

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function ownText(element: HTMLElement): string {
  return Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function hideDuplicateSectionLabel(root: HTMLElement): void {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("p, span, div"));

  for (const element of candidates) {
    if (normalizeText(element.textContent).toLocaleUpperCase("es") !== DUPLICATE_SECTION_LABEL) {
      continue;
    }

    let target = element;
    let parent = target.parentElement;
    while (
      parent &&
      parent !== root &&
      normalizeText(parent.textContent).toLocaleUpperCase("es") === DUPLICATE_SECTION_LABEL
    ) {
      target = parent;
      parent = parent.parentElement;
    }

    target.style.display = "none";
    break;
  }
}

function findSelectionTarget(root: HTMLElement): {
  checkbox: HTMLElement;
  container: HTMLElement;
} | null {
  const checkboxes = Array.from(
    root.querySelectorAll<HTMLElement>('[role="checkbox"]'),
  );

  for (const checkbox of checkboxes) {
    let node: HTMLElement | null = checkbox.parentElement;
    let outerSelectionOnly: HTMLElement | null = null;

    while (node && node !== root) {
      const text = normalizeText(node.textContent);
      if (/^(Seleccionar todo|Deseleccionar todo)$/i.test(text)) {
        outerSelectionOnly = node;
        node = node.parentElement;
        continue;
      }
      break;
    }

    if (outerSelectionOnly) {
      return { checkbox, container: outerSelectionOnly };
    }
  }

  return null;
}

function findHorizonTrigger(root: HTMLElement): HTMLElement | null {
  const horizonLabel = Array.from(root.querySelectorAll<HTMLElement>("*")).find(
    (element) => ownText(element) === "Horizonte",
  );
  if (!horizonLabel) return null;

  let node: HTMLElement | null = horizonLabel.parentElement;
  while (node && node !== root) {
    const trigger = node.querySelector<HTMLElement>('[role="combobox"]');
    if (trigger) return trigger;
    node = node.parentElement;
  }

  return null;
}

function isChecked(checkbox: HTMLElement): boolean {
  return (
    checkbox.getAttribute("aria-checked") === "true" ||
    checkbox.getAttribute("data-state") === "checked"
  );
}

export function FutureDebtView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [allSelected, setAllSelected] = useState(false);
  const [position, setPosition] = useState<ButtonPosition | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    let checkboxObserver: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const update = () => {
      hideDuplicateSectionLabel(root);

      const selection = findSelectionTarget(root);
      const horizonTrigger = findHorizonTrigger(root);

      if (!selection || !horizonTrigger) {
        setReady(false);
        return;
      }

      checkboxRef.current = selection.checkbox;
      selection.container.style.display = "none";

      const rootRect = root.getBoundingClientRect();
      const horizonRect = horizonTrigger.getBoundingClientRect();
      const narrow = rootRect.width < 760;

      setPosition(
        narrow
          ? {
              top: horizonRect.bottom - rootRect.top + 8,
              right: Math.max(0, rootRect.right - horizonRect.right),
              height: horizonRect.height,
            }
          : {
              top: horizonRect.top - rootRect.top,
              right: Math.max(0, rootRect.right - horizonRect.left + 10),
              height: horizonRect.height,
            },
      );
      setAllSelected(isChecked(selection.checkbox));
      setReady(true);

      checkboxObserver?.disconnect();
      checkboxObserver = new MutationObserver(() => {
        if (checkboxRef.current) {
          setAllSelected(isChecked(checkboxRef.current));
        }
      });
      checkboxObserver.observe(selection.checkbox, {
        attributes: true,
        attributeFilter: ["aria-checked", "data-state"],
      });

      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
      });
      resizeObserver.observe(root);
      resizeObserver.observe(horizonTrigger);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const treeObserver = new MutationObserver(scheduleUpdate);
    treeObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", scheduleUpdate);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frame);
      treeObserver.disconnect();
      checkboxObserver?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const handleSelectAll = () => {
    checkboxRef.current?.click();
    requestAnimationFrame(() => {
      if (checkboxRef.current) {
        setAllSelected(isChecked(checkboxRef.current));
      }
    });
  };

  return (
    <div ref={rootRef} className="relative">
      {ready && position ? (
        <button
          type="button"
          onClick={handleSelectAll}
          className="absolute z-30 inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-border bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            top: position.top,
            right: position.right,
            height: position.height,
          }}
          data-testid="future-debt-select-all-button"
          aria-pressed={allSelected}
        >
          {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
        </button>
      ) : null}
      <FutureDebtViewCore />
    </div>
  );
}
