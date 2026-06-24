import { logoutAdmin } from "@/app/admin/actions";

export function AdminLogoutForm() {
  return (
    <form action={logoutAdmin}>
      <button className="button button-secondary" type="submit">
        Sair
      </button>
    </form>
  );
}
