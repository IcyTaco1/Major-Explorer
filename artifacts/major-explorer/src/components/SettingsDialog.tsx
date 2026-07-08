import { useState, useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  User, Palette, SlidersHorizontal, ShieldCheck, Sun, Moon, Monitor,
  Check, UserCog, LogOut, ChevronRight, RotateCcw, type LucideIcon,
} from "lucide-react";
import { useGpaGoals, GpaGoalsControls } from "@/components/GpaGoals";
import { basePath } from "@/lib/basePath";
import type { Theme } from "@/lib/theme";
import type { UserProfile } from "@/lib/storage";

type SettingsSection = "account" | "appearance" | "profile" | "data";
const SETTINGS_SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "profile", label: "Profile", icon: SlidersHorizontal },
  { id: "data", label: "Data & privacy", icon: ShieldCheck },
];
const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export default function SettingsDialog({ initial, onSaveProfile, theme, onChangeTheme, onRetakeQuiz, onClose }: {
  initial: UserProfile;
  onSaveProfile: (p: UserProfile) => Promise<boolean>;
  theme: Theme;
  onChangeTheme: (t: Theme) => void;
  onRetakeQuiz: () => void;
  onClose: () => void;
}) {
  const [section, setSection] = useState<SettingsSection>("account");
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const gpaState = useGpaGoals(initial);
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Your account";
  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const initials = (user?.firstName?.[0] || "") + (user?.lastName?.[0] || "");

  const handleSaveProfile = async () => {
    const ok = await onSaveProfile(gpaState.profile);
    if (!ok) return;
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl w-full h-[600px] max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden rounded-3xl sm:rounded-3xl glass-popover">
        <DialogDescription className="sr-only">Manage your account, appearance, profile, and data settings.</DialogDescription>
        <div className="flex items-center px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-bold text-foreground">Settings</DialogTitle>
        </div>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row">
          <aside className="shrink-0 border-b sm:border-b-0 sm:border-r border-border p-3 sm:w-52">
            <nav className="flex sm:flex-col gap-1 overflow-x-auto no-scrollbar">
              {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
                const active = section === id;
                return (
                  <button
                    key={id}
                    onClick={() => setSection(id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {section === "account" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Account</h3>
                  <p className="text-sm text-muted-foreground">Manage your account and sign-in details.</p>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-background">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-bold shrink-0">
                    {initials || <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                    {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <button onClick={() => openUserProfile()} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <span className="flex items-center gap-3"><UserCog className="w-4 h-4 text-muted-foreground" /> Manage account</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => signOut({ redirectUrl: basePath || "/" })} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              </div>
            )}

            {section === "appearance" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Appearance</h3>
                  <p className="text-sm text-muted-foreground">Customize how Next Steps looks on this device.</p>
                </div>
                <div>
                  <span className="block text-sm font-semibold text-foreground mb-3">Theme</span>
                  <div className="grid grid-cols-3 gap-3">
                    {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                      const active = theme === value;
                      return (
                        <button
                          key={value}
                          onClick={() => onChangeTheme(value)}
                          className={`flex flex-col items-center gap-2 px-3 py-4 rounded-2xl border-2 text-sm font-medium transition-colors ${active ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"}`}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                          {active && <span className="text-[11px] font-semibold text-primary flex items-center gap-1"><Check className="w-3 h-3" /> Selected</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">“System” follows your device's light or dark setting automatically.</p>
                </div>
              </div>
            )}

            {section === "profile" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Profile</h3>
                  <p className="text-sm text-muted-foreground">Used to estimate your Reach / Match / Safety colleges.</p>
                </div>
                <GpaGoalsControls state={gpaState} />
                <div className="pt-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={!(gpaState.gpaValid && gpaState.satValid && gpaState.actValid)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="button-save-profile-settings"
                  >
                    {savedFlash ? <><Check className="w-4 h-4" /> Saved</> : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            {section === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground mb-1">Data &amp; privacy</h3>
                  <p className="text-sm text-muted-foreground">How your info is stored.</p>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-2xl border border-border bg-background">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">Your GPA, test scores, goals, quiz results, and saved colleges are saved privately to your account, so they follow you across devices. They're only used to personalize your experience — never shared or sold. Saved majors stay in this browser.</p>
                </div>
                <div className="space-y-2">
                  <button onClick={() => { onRetakeQuiz(); onClose(); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <span className="flex items-center gap-3"><RotateCcw className="w-4 h-4 text-muted-foreground" /> Retake the interest quiz</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
