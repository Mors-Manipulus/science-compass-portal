import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/auth")({
  head: () => ({ ...seo("Staff sign-in", "Sign in to the BlackSeaShark5 Labs research management dashboard."), meta: [...seo("Staff sign-in", "Sign in to the BlackSeaShark5 Labs research management dashboard.").meta, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
        if (error) throw error;
        setSent(true);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-5 py-16">
      <p className="eyebrow">Staff only</p>
      <h1 className="mt-2 text-2xl font-semibold">{mode === "in" ? "Sign in" : "Create staff account"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Creating an account does not grant access. The lab owner must approve you as an admin.
      </p>
      {sent ? (
        <div role="status" className="mt-8 rounded-md border border-border bg-surface p-5 text-sm">
          Check your email to confirm your account, then sign in.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={8} autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
      )}
      <button className="mt-6 text-sm text-primary hover:underline" onClick={() => { setMode(mode === "in" ? "up" : "in"); setSent(false); }}>
        {mode === "in" ? "Need an account? Create one" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
