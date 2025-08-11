export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function isAllowedEmail(email: string) {
  const domain = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN;
  return domain ? email.toLowerCase().endsWith("@" + domain.toLowerCase()) : true;
}

