import { genericArgentinaSalaryReceiptParser } from "./generic-argentina.salary-receipt.parser.js";
import type { SalaryReceiptParser } from "./salary-receipt-parser.types.js";

export const salaryReceiptParsers: readonly SalaryReceiptParser[] = [
  genericArgentinaSalaryReceiptParser,
];
