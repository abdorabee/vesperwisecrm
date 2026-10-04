export function signupTermsAccepted(formData: FormData): boolean {
  return formData.get("accept_terms") === "yes";
}
