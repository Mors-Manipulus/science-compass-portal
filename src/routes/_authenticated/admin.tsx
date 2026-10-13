import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Building2, FileUp, FolderKanban, LayoutDashboard, LogOut, Newspaper, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StaffContext, type StaffCtx } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — BlackSeaShark5 Labs" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/publications", label: "Publications", icon: BookOpen },
  { to: "/admin/researchers", label: "Researchers", icon: Users },
  { to: "/admin/divisions", label: "Divisions", icon: Building2 },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/news", label: "News", icon: Newspaper },
  { to: "/admin/import", label: "Import", icon: FileUp },
  { to: "/admin/access", label: "Admin access", icon: ShieldCheck },
] as const;

function AdminLayout() {
  const { user } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const roles = useQuery({
    queryKey: ["my-roles", user.id],
    queryFn: async () => {
      const [r, o] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.rpc("owner_exists"),
      ]);
      if (r.error) throw r.error;
      return { roles: r.data.map((x) => x.role), ownerExists: !!o.data };
    },
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (roles.isPending) return <div className="p-10 text-sm text-muted-foreground">Checking access…</div>;
  if (roles.error) return <div className="p-10 text-sm text-destructive">Couldn't verify access.</div>;

  if (!roles.data.roles.length) {
    const claim = async () => {
      const { data, error } = await supabase.rpc("claim_initial_owner");
      if (error) return toast.error(error.message);
      if (!data) return toast.error("An owner already exists.");
      toast.success("You are now the site owner.");
      roles.refetch();
    };
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <Logo />
        <h1 className="mt-8 text-2xl font-semibold">No admin access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {user.email}. {roles.data.ownerExists ? "Ask the site owner to grant you admin access." : "No owner has been set up yet."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {!roles.data.ownerExists && <Button onClick={claim}>Become site owner</Button>}
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const ctx: StaffCtx = { userId: user.id, email: user.email ?? "", roles: roles.data.roles, isOwner: roles.data.roles.includes("owner") };

  return (
    <StaffContext.Provider value={ctx}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b border-border bg-sidebar md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex h-16 items-center px-5"><Logo /></div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible" aria-label="Admin">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: "exact" in n }}
                className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                activeProps={{ className: "bg-sidebar-accent text-foreground" }}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="hidden px-5 py-4 text-xs text-muted-foreground md:absolute md:bottom-0 md:block md:w-60">
            <p className="truncate">{user.email}</p>
            <p className="font-mono uppercase text-primary">{ctx.isOwner ? "Owner" : "Admin"}</p>
            <div className="mt-3 flex gap-3">
              <Link to="/" className="hover:text-foreground">View site</Link>
              <button onClick={signOut} className="inline-flex items-center gap-1 hover:text-foreground"><LogOut className="h-3 w-3" /> Sign out</button>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-5 md:p-8">
          <Outlet />
          <button onClick={signOut} className="mt-10 text-xs text-muted-foreground md:hidden">Sign out</button>
        </main>
      </div>
    </StaffContext.Provider>
  );
}
