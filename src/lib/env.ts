const isProduction = process.env.NODE_ENV === "production";

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function mongoDbName(): string {
  const explicit = clean(process.env.MONGODB_DB);
  if (explicit) return explicit;
  const uri = clean(process.env.MONGODB_URI) || "mongodb://127.0.0.1:27017";
  try {
    const withoutQuery = uri.split("?")[0];
    const afterHost = withoutQuery.split("/").slice(3).join("/");
    return afterHost || "ghchikkis";
  } catch {
    return "ghchikkis";
  }
}

export const env = {
  isProduction,
  appUrl: (clean(process.env.APP_URL) || "http://localhost:3000").replace(/\/$/, ""),
  mongodbUri: clean(process.env.MONGODB_URI) || "mongodb://127.0.0.1:27017",
  mongodbDb: mongoDbName(),
  ownerEmail: clean(process.env.OWNER_EMAIL).toLowerCase(),
  devAuthEnabled: !isProduction && process.env.DEV_AUTH_ENABLED === "true",
  google: {
    clientId: clean(process.env.GOOGLE_CLIENT_ID),
    clientSecret: clean(process.env.GOOGLE_CLIENT_SECRET),
  },
  cloudinary: {
    cloudName: clean(process.env.CLOUDINARY_CLOUD_NAME),
    apiKey: clean(process.env.CLOUDINARY_API_KEY),
    apiSecret: clean(process.env.CLOUDINARY_API_SECRET),
  },
  whatsapp: {
    mode: clean(process.env.WHATSAPP_MODE).toLowerCase() === "live" ? "live" : "simulate",
    phoneNumberId: clean(process.env.WHATSAPP_PHONE_NUMBER_ID),
    accessToken: clean(process.env.WHATSAPP_ACCESS_TOKEN),
    appSecret: clean(process.env.WHATSAPP_APP_SECRET),
    verifyToken: clean(process.env.WHATSAPP_VERIFY_TOKEN),
    graphVersion: clean(process.env.WHATSAPP_GRAPH_VERSION) || "v23.0",
  },
  gmail: {
    clientId: clean(process.env.GMAIL_CLIENT_ID),
    clientSecret: clean(process.env.GMAIL_CLIENT_SECRET),
    refreshToken: clean(process.env.GMAIL_REFRESH_TOKEN),
    sender: clean(process.env.GMAIL_SENDER),
  },
  backup: {
    encryptionKey: clean(process.env.BACKUP_ENCRYPTION_KEY),
    provider: clean(process.env.BACKUP_PROVIDER) || "local",
    localDir: clean(process.env.BACKUP_LOCAL_DIR) || ".backups",
  },
  cronSecret: clean(process.env.CRON_SECRET),
  turnstile: {
    secretKey: clean(process.env.TURNSTILE_SECRET_KEY),
    siteKey: clean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  },
  gaId: clean(process.env.NEXT_PUBLIC_GA_ID),
} as const;

export const googleConfigured = Boolean(env.google.clientId && env.google.clientSecret);
export const cloudinaryConfigured = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret,
);
export const whatsappConfigured = Boolean(
  env.whatsapp.phoneNumberId && env.whatsapp.accessToken && env.whatsapp.appSecret,
);
export const gmailConfigured = Boolean(
  env.gmail.clientId &&
    env.gmail.clientSecret &&
    env.gmail.refreshToken &&
    env.gmail.sender,
);

export function requireProductionSecret(name: string, value: string): string {
  if (!value && isProduction) {
    throw new Error(`Missing required production environment variable: ${name}`);
  }
  return value;
}
