"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KeyRow {
  id: string;
  label: string | null;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export function ApiKeys() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [label, setLabel] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/keys");
    if (res.ok) setKeys((await res.json()).keys ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function create() {
    setBusy(true);
    setCreated(null);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: label || "API key" }),
    });
    setBusy(false);
    if (res.ok) {
      setCreated((await res.json()).key);
      setLabel("");
      void load();
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Create a key so another app (e.g. your Amazon affiliate engine) can post
        to your connected platforms via <code>/api/v1/publish</code>.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="Label (e.g. Amazon engine)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button onClick={create} disabled={busy}>
          {busy ? "Creating…" : "Create key"}
        </Button>
      </div>

      {created && (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm">
          <p className="font-medium">Copy this key now — it won&apos;t be shown again:</p>
          <code className="mt-1 block break-all font-mono text-xs">{created}</code>
        </div>
      )}

      <ul className="divide-y rounded-md border">
        {keys.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">No API keys yet.</li>
        )}
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between p-3 text-sm">
            <span>
              <span className="font-medium">{k.label ?? "API key"}</span>{" "}
              <code className="font-mono text-xs text-muted-foreground">{k.key_prefix}…</code>
              {k.last_used_at && (
                <span className="ml-2 text-xs text-muted-foreground">
                  last used {new Date(k.last_used_at).toLocaleDateString()}
                </span>
              )}
            </span>
            <button
              onClick={() => revoke(k.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
