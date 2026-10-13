import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/data/admin";
import { fieldCls } from "@/components/admin/bits";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/access")({ component: Access });

function Access() {
  const me = useStaff();
  const [email, setEmail] = useState("");
  const staff = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_staff");
      if (error) throw error;
      return data;
    },
  });

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.rpc("grant_admin", { _email: email });
    if (error) return toast.error(error.message);
    toast.success(`${email} is now an admin.`);
    setEmail("");
    staff.refetch();
  };
  const revoke = async (userId: string, mail: string) => {
    if (!window.confirm(`Remove admin access for ${mail}?`)) return;
    const { error } = await supabase.rpc("revoke_admin", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("Admin access removed.");
    staff.refetch();
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Admin access</h1>
      <p className="mt-1 text-sm text-muted-foreground">Owners manage who can edit content. Admins can manage all content but cannot grant access.</p>
      {me.isOwner ? (
        <form onSubmit={grant} className="mt-6 flex gap-2">
          <input type="email" required placeholder="colleague@example.com" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldCls} />
          <Button type="submit">Grant admin</Button>
        </form>
      ) : (
        <p className="mt-6 rounded-md border border-border bg-surface p-4 text-sm">Only the owner can grant or revoke admin access.</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">The person must first create an account on the staff sign-in page.</p>
      <ul className="mt-8 divide-y divide-border rounded-md border border-border">
        {staff.data?.map((s) => (
          <li key={`${s.user_id}-${s.role}`} className="flex items-center justify-between p-4 text-sm">
            <span>{s.email}<span className="ml-2 font-mono text-xs uppercase text-primary">{s.role}</span></span>
            {me.isOwner && s.role === "admin" && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => revoke(s.user_id, s.email)}>Revoke</Button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
