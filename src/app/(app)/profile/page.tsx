import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { getCurrentUser } from "@/lib/data/current-user";

export const metadata: Metadata = {
  title: "Profile · Todo",
};

export default async function ProfilePage() {
  const { profile } = await getCurrentUser();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <>
      <div className="animate-fade-up mb-6 sm:mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Profile</h1>
        <p className="mt-2 text-muted">
          Your account details{memberSince ? ` · member since ${memberSince}` : ""}.
        </p>
      </div>

      {profile ? (
        <div className="animate-fade-up [animation-delay:60ms]">
          <ProfileForm
            name={profile.name ?? ""}
            email={profile.email ?? ""}
            phone={profile.phone ?? ""}
          />
        </div>
      ) : (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
          Couldn&apos;t load your profile. Refresh the page to try again.
        </p>
      )}
    </>
  );
}
