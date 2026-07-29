import type {
  CardPaymentCard,
  CardPaymentMoney,
  CardPaymentsResponse,
} from "./card-payments.service.js";

function parseMoney(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addMoney(left: CardPaymentMoney, right: CardPaymentMoney): CardPaymentMoney {
  return {
    ars: (parseMoney(left.ars) + parseMoney(right.ars)).toFixed(2),
    usd: (parseMoney(left.usd) + parseMoney(right.usd)).toFixed(2),
  };
}

function isSyntheticManualCard(card: CardPaymentCard): boolean {
  return card.cardId.startsWith("manual-card:NONE:");
}

function findTargetCard(
  manualCard: CardPaymentCard,
  candidates: CardPaymentCard[],
): CardPaymentCard | null {
  const normalizedHolder = manualCard.holderName?.trim().toLocaleLowerCase("es");
  if (normalizedHolder) {
    const byLabel = candidates.filter(
      (candidate) =>
        candidate.cardLabel.trim().toLocaleLowerCase("es") === normalizedHolder,
    );
    if (byLabel.length === 1) return byLabel[0];

    const byHolder = candidates.filter(
      (candidate) =>
        candidate.holderName?.trim().toLocaleLowerCase("es") === normalizedHolder,
    );
    if (byHolder.length === 1) return byHolder[0];
  }

  return candidates.length === 1 ? candidates[0] : null;
}

export function normalizeManualCardAssignments(
  response: CardPaymentsResponse,
): CardPaymentsResponse {
  const regularCards = response.cards.filter((card) => !isSyntheticManualCard(card));
  const syntheticCards = response.cards.filter(isSyntheticManualCard);
  if (syntheticCards.length === 0) return response;

  const unresolved: CardPaymentCard[] = [];

  for (const manualCard of syntheticCards) {
    const target = findTargetCard(manualCard, regularCards);
    if (!target) {
      unresolved.push({
        ...manualCard,
        cardLabel: "Compra manual sin tarjeta identificada",
        cardLast4: null,
      });
      continue;
    }

    target.movements.push(...manualCard.movements);
    target.movements.sort((left, right) => {
      const leftDate = left.dateIso ?? "9999-99-99";
      const rightDate = right.dateIso ?? "9999-99-99";
      return (
        leftDate.localeCompare(rightDate) ||
        left.description.localeCompare(right.description, "es")
      );
    });

    for (const sourceTotal of manualCard.totalsByMonth) {
      const targetTotal = target.totalsByMonth.find(
        (item) => item.monthKey === sourceTotal.monthKey,
      );
      if (targetTotal) {
        targetTotal.totals = addMoney(targetTotal.totals, sourceTotal.totals);
      } else {
        target.totalsByMonth.push(sourceTotal);
      }
    }
  }

  return {
    ...response,
    cards: [...regularCards, ...unresolved],
  };
}
