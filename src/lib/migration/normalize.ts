import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

const STREET_SUFFIXES: Record<string, string> = {
  street: "St",
  st: "St",
  avenue: "Ave",
  ave: "Ave",
  boulevard: "Blvd",
  blvd: "Blvd",
  drive: "Dr",
  dr: "Dr",
  road: "Rd",
  rd: "Rd",
  lane: "Ln",
  ln: "Ln",
  court: "Ct",
  ct: "Ct",
  place: "Pl",
  pl: "Pl",
  terrace: "Ter",
  ter: "Ter",
  circle: "Cir",
  cir: "Cir",
  trail: "Trl",
  trl: "Trl",
  parkway: "Pkwy",
  pkwy: "Pkwy",
  highway: "Hwy",
  hwy: "Hwy",
  way: "Way",
  plaza: "Plz",
  plz: "Plz",
  square: "Sq",
  sq: "Sq",
};

const DIRECTIONS: Record<string, string> = {
  north: "N",
  n: "N",
  south: "S",
  s: "S",
  east: "E",
  e: "E",
  west: "W",
  w: "W",
  northeast: "NE",
  ne: "NE",
  northwest: "NW",
  nw: "NW",
  southeast: "SE",
  se: "SE",
  southwest: "SW",
  sw: "SW",
};

const UNIT_MARKERS: Record<string, string> = {
  apartment: "Apt",
  apt: "Apt",
  unit: "Apt",
  suite: "Apt",
  ste: "Apt",
};

const STATES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  "district of columbia": "DC",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneToE164(
  value: string,
  defaultCountry: CountryCode = "US",
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
  if (!parsed?.isValid()) {
    return null;
  }

  return parsed.number;
}

export function normalizeOwnerName(
  firstName: string,
  lastName?: string | null,
): string {
  return collapseWhitespace([firstName, lastName ?? ""].filter(Boolean).join(" "));
}

export function ownerNameKey(
  firstName: string,
  lastName?: string | null,
): string {
  return normalizeOwnerName(firstName, lastName).toLowerCase();
}

export function normalizeStoredAddressLine(value: string): string {
  const cleaned = value.replace(/[#.,]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  const tokens = cleaned.split(" ").map((token) => {
    const key = token.toLowerCase();
    return STREET_SUFFIXES[key] ?? DIRECTIONS[key] ?? UNIT_MARKERS[key] ?? token;
  });

  if (tokens.length >= 2 && /^\d+[a-z]?$/i.test(tokens[tokens.length - 1] ?? "")) {
    const previous = tokens[tokens.length - 2]?.toLowerCase();
    if (previous && STREET_SUFFIXES[previous]) {
      tokens.splice(tokens.length - 1, 0, "Apt");
    }
  }

  return tokens.join(" ");
}

export function normalizeStoredState(value: string): string {
  const cleaned = collapseWhitespace(value).replace(/\./g, "");
  if (!cleaned) {
    return "";
  }
  if (cleaned.length === 2) {
    return cleaned.toUpperCase();
  }
  return STATES[cleaned.toLowerCase()] ?? cleaned;
}

export function normalizePostal(value: string): string {
  const trimmed = collapseWhitespace(value);
  if (!trimmed) {
    return "";
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 5) {
    return digits.slice(0, 5);
  }
  return trimmed.toUpperCase();
}

export function normalizeAddressKey(parts: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): string {
  const line = normalizeStoredAddressLine(
    [parts.addressLine1, parts.addressLine2]
      .filter((part) => part?.trim())
      .join(" "),
  )
    .toLowerCase()
    .replace(/\|/g, " ");
  const city = collapseWhitespace(parts.city ?? "")
    .toLowerCase()
    .replace(/\|/g, " ");
  const state = normalizeStoredState(parts.state ?? "")
    .toLowerCase()
    .replace(/\|/g, " ");
  const postal = normalizePostal(parts.postalCode ?? "")
    .toLowerCase()
    .replace(/\|/g, " ");
  return [line, city, state, postal].join("|");
}
