import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export function normalizeDialerPhone(
  value: string,
  defaultCountry = "US",
): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Contact does not have a phone number");
  }

  const phone = parsePhoneNumberFromString(
    trimmed,
    defaultCountry.toUpperCase() as CountryCode,
  );
  if (!phone?.isValid()) {
    throw new Error("Contact phone number is not valid");
  }
  return phone.number;
}
