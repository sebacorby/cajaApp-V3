export function parseDate(dateStr: string): string {
  const normalized = dateStr.trim();

  const parts = normalized.split(/[-/]/);
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  let day: number, month: number, year: number;

  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);

    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
  }

  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}`);
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getMonthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${monthNames[monthIndex]}-${year}`;
}

export function addMonths(monthKey: string, months: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDateShort(dateIso: string): string {
  const date = new Date(dateIso + "T00:00:00");
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}
