import { logout } from "@/app/auth/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="fantasy-button fantasy-button--stone"
      >
        Leave House
      </button>
    </form>
  );
}
