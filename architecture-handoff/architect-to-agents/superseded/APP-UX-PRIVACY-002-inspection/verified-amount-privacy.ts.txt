export type AmountCurrency = "ARS" | "USD" | null | undefined;

type PrivacyListener = () => void;

const MASK = "••••";
const CURRENCY_AMOUNT_PATTERN =
  /(?:(?:US|U)\s*\$|U\$D|USD|ARS|\$)\s*-?\s*\d(?:[\d\s.,]*\d)?/giu;
const BARE_AMOUNT_PATTERN = /^\s*-?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?\s*$/u;
const AMOUNT_CONTEXT_PATTERN =
  /importe|monto|saldo|total|ingreso|egreso|gasto|ahorro|deuda|cuota|pago|balance|presupuesto|disponible|consumo|ars|usd|pesos|d[oó]lares/iu;

let amountsHidden = true;
const listeners = new Set<PrivacyListener>();

export function areAmountsHidden(): boolean {
  return amountsHidden;
}

export function amountPrivacyMask(currency?: AmountCurrency): string {
  if (currency === "USD") return `US$ ${MASK}`;
  if (currency === "ARS") return `$ ${MASK}`;
  return MASK;
}

export function maskMonetaryText(value: string): string {
  return value.replace(CURRENCY_AMOUNT_PATTERN, (token) => {
    const normalized = token.toUpperCase().replace(/\s/g, "");
    if (
      normalized.startsWith("US$") ||
      normalized.startsWith("U$") ||
      normalized.startsWith("U$D") ||
      normalized.startsWith("USD")
    ) {
      return amountPrivacyMask("USD");
    }
    return amountPrivacyMask("ARS");
  });
}

export function protectFormattedAmount(
  formatted: string,
  currency?: AmountCurrency,
): string {
  return amountsHidden ? amountPrivacyMask(currency) : formatted;
}

export function setAmountPrivacyHidden(value: boolean): void {
  amountsHidden = value;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.amountsHidden = value ? "true" : "false";
  }
  for (const listener of listeners) listener();
}

export function subscribeAmountPrivacy(listener: PrivacyListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function elementContext(element: Element): string {
  const parent = element.parentElement;
  return [
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    element.getAttribute("data-testid"),
    element.className,
    parent?.getAttribute("aria-label"),
    parent?.getAttribute("title"),
    parent?.getAttribute("data-testid"),
    element.previousElementSibling?.textContent,
    parent?.firstElementChild === element
      ? null
      : parent?.firstElementChild?.textContent,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function tableHeaderContext(element: Element): string {
  const cell = element.closest("td");
  const table = cell?.closest("table");
  if (!cell || !table) return "";
  const row = cell.parentElement;
  const index = row ? Array.from(row.children).indexOf(cell) : -1;
  if (index < 0) return "";
  const headers = table.querySelectorAll("thead th");
  return headers.item(index)?.textContent ?? "";
}

function isBareAmountInFinancialContext(
  value: string,
  element: Element | null,
): boolean {
  if (!element || !BARE_AMOUNT_PATTERN.test(value)) return false;
  return AMOUNT_CONTEXT_PATTERN.test(
    `${elementContext(element)} ${tableHeaderContext(element)}`,
  );
}

function maskedValue(value: string, element: Element | null): string {
  const monetary = maskMonetaryText(value);
  if (monetary !== value) return monetary;
  return isBareAmountInFinancialContext(value, element) ? MASK : value;
}

export function installAmountPrivacyDomGuard(
  root: ParentNode = document.body,
): () => void {
  const originalText = new WeakMap<Text, string>();
  const trackedText = new Set<Text>();
  const originalAttributes = new WeakMap<Element, Map<string, string>>();
  const trackedElements = new Set<Element>();
  let mutating = false;

  const maskTextNode = (node: Text) => {
    const current = node.nodeValue ?? "";
    const stored = originalText.get(node);
    let original = stored ?? current;

    if (stored === undefined) {
      originalText.set(node, current);
      trackedText.add(node);
    } else {
      const previousMask = maskedValue(stored, node.parentElement);
      if (current !== stored && current !== previousMask) {
        original = current;
        originalText.set(node, current);
      }
      trackedText.add(node);
    }

    const masked = maskedValue(original, node.parentElement);
    if (masked !== current) node.nodeValue = masked;
  };

  const maskElementAttributes = (element: Element) => {
    for (const attribute of ["aria-label", "title"] as const) {
      const current = element.getAttribute(attribute);
      if (!current) continue;

      let originals = originalAttributes.get(element);
      const stored = originals?.get(attribute);
      let original = stored ?? current;

      if (stored !== undefined) {
        const previousMask = maskedValue(stored, element);
        if (current !== stored && current !== previousMask) {
          original = current;
          originals?.set(attribute, current);
        }
      }

      const masked = maskedValue(original, element);
      if (masked === current) continue;

      if (!originals) {
        originals = new Map<string, string>();
        originalAttributes.set(element, originals);
      }
      if (!originals.has(attribute)) originals.set(attribute, original);
      trackedElements.add(element);
      element.setAttribute(attribute, masked);
    }
  };

  const maskSubtree = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      maskTextNode(node as Text);
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      maskElementAttributes(node as Element);
    }
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    );
    let current: Node | null = walker.nextNode();
    while (current) {
      if (current.nodeType === Node.TEXT_NODE) {
        maskTextNode(current as Text);
      } else {
        maskElementAttributes(current as Element);
      }
      current = walker.nextNode();
    }
  };

  const restore = () => {
    for (const node of trackedText) {
      const original = originalText.get(node);
      if (original !== undefined && node.isConnected) node.nodeValue = original;
    }
    for (const element of trackedElements) {
      const originals = originalAttributes.get(element);
      if (!originals || !element.isConnected) continue;
      for (const [attribute, value] of originals) {
        element.setAttribute(attribute, value);
      }
    }
    trackedText.clear();
    trackedElements.clear();
  };

  const apply = () => {
    if (mutating) return;
    mutating = true;
    try {
      if (amountsHidden) maskSubtree(root as Node);
      else restore();
    } finally {
      mutating = false;
    }
  };

  const observer = new MutationObserver((records) => {
    if (!amountsHidden || mutating) return;
    mutating = true;
    try {
      for (const record of records) {
        if (record.type === "characterData") {
          maskTextNode(record.target as Text);
        } else if (record.type === "attributes") {
          maskElementAttributes(record.target as Element);
        }
        for (const addedNode of record.addedNodes) maskSubtree(addedNode);
      }
    } finally {
      mutating = false;
    }
  });

  observer.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title"],
  });
  const unsubscribe = subscribeAmountPrivacy(apply);
  apply();

  return () => {
    observer.disconnect();
    unsubscribe();
    restore();
  };
}
