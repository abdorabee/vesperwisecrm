export function requireRows<T>(
  data: T[] | null,
  error: { message: string } | null,
  message: string,
): T[] {
  if (error) {
    throw new Error(error.message);
  }
  if (!data?.length) {
    throw new Error(message);
  }
  return data;
}
