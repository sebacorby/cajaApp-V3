import { genericArgentinaSalaryReceiptParser } from "./generic-argentina.salary-receipt.parser.js";
import { fluxitSalaryReceiptParser } from "./fluxit.salary-receipt.parser.js";
import { nttDataSalaryReceiptParser } from "./ntt-data.salary-receipt.parser.js";
import type { SalaryReceiptParser } from "./salary-receipt-parser.types.js";

export const salaryReceiptParsers: readonly SalaryReceiptParser[] = [
  fluxitSalaryReceiptParser,
  nttDataSalaryReceiptParser,
  genericArgentinaSalaryReceiptParser,
];
