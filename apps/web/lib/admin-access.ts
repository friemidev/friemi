type AdminFields = {
  userId: string | null | undefined;
  email?: string | null;
  publicRole?: string | null;
  privateRole?: string | null;
};

function splitToSet(value: string | undefined, toLowerCase = false) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => (toLowerCase ? item.trim().toLowerCase() : item.trim()))
      .filter(Boolean),
  );
}

function readStringProperty(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function readRoleFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  return readStringProperty(metadata as Record<string, unknown>, "role");
}

export function extractAdminContextFromSessionClaims(sessionClaims: unknown) {
  if (!sessionClaims || typeof sessionClaims !== "object") {
    return { email: null, publicRole: null, privateRole: null };
  }

  const claims = sessionClaims as Record<string, unknown>;
  const email =
    readStringProperty(claims, "email") ??
    readStringProperty(claims, "email_address") ??
    readStringProperty(claims, "primary_email_address");

  const publicMetadata = claims.public_metadata;
  const privateMetadata = claims.private_metadata;

  return {
    email,
    publicRole: readRoleFromMetadata(publicMetadata),
    privateRole: readRoleFromMetadata(privateMetadata),
  };
}

export function hasAdminConfig() {
  const adminUserIds = splitToSet(process.env.ADMIN_CLERK_USER_IDS);
  const adminEmails = splitToSet(process.env.ADMIN_EMAILS, true);
  return adminUserIds.size > 0 || adminEmails.size > 0;
}

export function isAdminByFields(fields: AdminFields) {
  if (!fields.userId) {
    return false;
  }

  const adminUserIds = splitToSet(process.env.ADMIN_CLERK_USER_IDS);
  if (adminUserIds.has(fields.userId)) {
    return true;
  }

  const adminEmails = splitToSet(process.env.ADMIN_EMAILS, true);
  if (fields.email && adminEmails.has(fields.email.toLowerCase())) {
    return true;
  }

  return fields.publicRole === "admin" || fields.privateRole === "admin";
}

