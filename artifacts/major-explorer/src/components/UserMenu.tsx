import { useState, useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/react";
import { User, LogOut } from "lucide-react";
import { basePath } from "@/lib/basePath";

export default function UserMenu() {
  const { signOut } = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Account";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 p-1.5 sm:pl-3 sm:pr-4 sm:py-2 rounded-full border border-border glass-panel hover:bg-muted hover:border-muted-foreground transition-all"
      >
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
          {initials || <User className="w-3.5 h-3.5" />}
        </div>
        <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[100px] truncate">{displayName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 glass-popover border border-border rounded-2xl shadow-xl w-52 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground font-medium">Signed in as</p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">{user?.emailAddresses?.[0]?.emailAddress}</p>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
