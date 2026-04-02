import { logout } from "@/app/auth/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-full border border-white/14 bg-white/6 px-5 py-3 text-sm font-medium text-stone-100 transition-colors hover:bg-white/10"
      >
        Log out
      </button>
    </form>
  );
}
