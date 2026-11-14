import dns from "node:dns/promises";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "getnada.com",
  "maildrop.cc",
  "fakeinbox.com",
  "dispostable.com",
  "throwawaymail.com",
  "mohmal.com",
  "mailnesia.com",
]);

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "icloud.con": "icloud.com",
};

const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export async function validateRealEmailAddress(
  rawEmail: string
): Promise<{ valid: boolean; reason?: string }> {
  const email = rawEmail.trim().toLowerCase();

  if (!email || !STRICT_EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      reason: "Please enter a valid email address format (e.g., name@gmail.com).",
    };
  }

  const parts = email.split("@");
  if (parts.length !== 2) {
    return {
      valid: false,
      reason: "Please enter a valid email address.",
    };
  }

  const [localPart, domain] = parts;

  if (localPart.length < 2 || localPart.startsWith(".") || localPart.endsWith(".")) {
    return {
      valid: false,
      reason: "Please enter a valid email username before the '@' symbol.",
    };
  }

  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1] ?? "";
  if (domainParts.length < 2 || tld.length < 2) {
    return {
      valid: false,
      reason: `The email domain "@${domain}" is incomplete.`,
    };
  }

  if (COMMON_DOMAIN_TYPOS[domain]) {
    return {
      valid: false,
      reason: `Did you mean "@${COMMON_DOMAIN_TYPOS[domain]}"? Please check the spelling of your email address.`,
    };
  }

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      valid: false,
      reason: "Disposable or temporary email addresses are not permitted. Please use your real personal, school, or work email.",
    };
  }

  if (
    domain === "example.com" ||
    domain === "test.com" ||
    domain === "localhost" ||
    domain.endsWith(".invalid") ||
    domain.endsWith(".test")
  ) {
    return {
      valid: false,
      reason: `Please use a real, active email address ("@${domain}" is a placeholder domain).`,
    };
  }

  // Perform live DNS MX record verification to ensure the domain can actually receive emails
  try {
    const mxRecords = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS_TIMEOUT")), 3500)
      ),
    ]);

    const hasValidMx =
      Array.isArray(mxRecords) &&
      mxRecords.length > 0 &&
      mxRecords.some((r) => Boolean(r.exchange && r.exchange.trim() && r.exchange !== "."));

    if (!hasValidMx) {
      return {
        valid: false,
        reason: `The domain "@${domain}" does not have a valid mail server to receive emails. Please check your email address.`,
      };
    }
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (
      code === "ENOTFOUND" ||
      code === "ENODATA" ||
      code === "ESERVFAIL" ||
      code === "EREFUSED"
    ) {
      return {
        valid: false,
        reason: `The email domain "@${domain}" does not exist or cannot receive emails. Please enter a valid email address.`,
      };
    }
    // If DNS times out on a restricted network, allow fallback rather than false-blocking a real user
  }

  return { valid: true };
}
