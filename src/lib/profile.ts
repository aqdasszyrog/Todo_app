export const NAME_MAX_LENGTH = 100;

export type Profile = {
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export function displayNameOf(profile: Profile | null) {
  return profile?.name ?? profile?.email ?? "there";
}
