export function signupAgeConfirmed(formData: FormData): boolean {
  return formData.get("confirm_age") === "yes";
}
