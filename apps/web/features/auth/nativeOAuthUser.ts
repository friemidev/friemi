export type VerifiedNativeOAuthProfile = {
  provider: "google" | "apple";
  subject: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};

type NativeOAuthUser = { id: string; externalId?: string | null };

export type NativeOAuthUsers = {
  getUserList(query: {
    externalId?: string[];
    emailAddress?: string[];
    limit: number;
  }): Promise<{ data: NativeOAuthUser[] }>;
  updateUser(
    id: string,
    params: { externalId: string },
  ): Promise<NativeOAuthUser>;
  createUser(params: {
    emailAddress: string[];
    externalId: string;
    firstName?: string;
    lastName?: string;
    skipLegalChecks: boolean;
    skipPasswordRequirement: boolean;
    unsafeMetadata: { nativeOAuthProvider: "google" | "apple" };
  }): Promise<NativeOAuthUser>;
};

// Only provider-verified identities may reach email-based account linking.
export async function findOrCreateNativeOAuthUser(
  users: NativeOAuthUsers,
  profile: VerifiedNativeOAuthProfile,
) {
  const externalId = `${profile.provider}:${profile.subject}`;
  const usersByExternalId = await users.getUserList({
    externalId: [externalId],
    limit: 1,
  });
  const linkedUser = usersByExternalId.data[0];

  if (linkedUser) return linkedUser;

  if (!profile.email) {
    throw new Error("This account must share an email before it can sign in.");
  }

  const usersByEmail = await users.getUserList({
    emailAddress: [profile.email],
    limit: 1,
  });
  const existingUser = usersByEmail.data[0];

  if (existingUser) {
    if (!existingUser.externalId) {
      try {
        return await users.updateUser(existingUser.id, { externalId });
      } catch {
        return existingUser;
      }
    }
    return existingUser;
  }

  return users.createUser({
    emailAddress: [profile.email],
    externalId,
    firstName: profile.firstName,
    lastName: profile.lastName,
    skipLegalChecks: true,
    skipPasswordRequirement: true,
    unsafeMetadata: { nativeOAuthProvider: profile.provider },
  });
}
