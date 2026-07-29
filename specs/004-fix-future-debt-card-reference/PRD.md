# PRD — 004-fix-future-debt-card-reference

## Bug Description

### Title
Future debt installments show "missing_card_reference" instead of being grouped under the card

### Problem Statement
When loading the Future Debt view, all installment rows show "missing_card_reference" as the card identifier, even though they all belong to the same card (the one that was just imported). The UI displays them as "sin tarjeta" when they should be grouped under the correct card.

### Expected Behavior
Each future debt installment should show the correct card reference (e.g., "Banco Galicia - *1234") and be grouped under that card in the UI.

### Screenshots / UI State
The user sees:
```
Cuota Agosto-2026 | missing_card_reference | $ 33.300,00
Cuota Agosto-2026 | missing_card_reference | $ 21.666,68
...
```

### What Should Happen
All rows should be associated with the card that was imported, displaying the card name/nickname.
