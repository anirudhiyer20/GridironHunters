import { PageShell } from "@/components/page-shell";
import { createClient } from "@/lib/supabase/server";

import { WardrobeEditor } from "./wardrobe-editor";
import { normalizeCharacter } from "./wardrobe-model";

type WardrobePageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function WardrobePage({ searchParams }: WardrobePageProps) {
  const { message } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const { data: characterRow } = user
    ? await supabase.from("user_characters").select("*").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const character = normalizeCharacter(characterRow);

  return (
    <PageShell
      eyebrow="House / Wardrobe"
      title="Wardrobe"
    >
      <WardrobeEditor
        initialCharacter={character}
        displayName={profile?.display_name ?? user?.email ?? "House Warden"}
        message={message}
      />
    </PageShell>
  );
}
