import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { setSession } from "@/lib/store";
import { resolveRoleFromPin } from "@/lib/auth-frontend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!pin) return;
    setLoading(true);
    setError("");
    const role = resolveRoleFromPin(pin.trim());
    if (!role) {
      setError("Invalid PIN");
      setLoading(false);
      return;
    }
    setSession(role);
    navigate("/");
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">ZingCab Fleet</h1>
          <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="text-center text-lg tracking-[0.2em] h-12"
            maxLength={32}
            autoComplete="current-password"
          />
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button onClick={handleLogin} className="w-full h-11" disabled={!pin || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? "Unlocking..." : "Unlock"}
          </Button>
          <Button variant="outline" className="w-full h-11" asChild>
            <Link to="/savari">SAVVARI</Link>
          </Button>
          <Button variant="outline" className="w-full h-11 gap-2" asChild>
            <Link to="/savari/bot">
              <Bot className="h-4 w-4" />
              Savaari bot
            </Link>
          </Button>
          <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
            Admin and staff use different PINs. Staff cannot delete entries or payments from the app.
          </p>
        </div>
      </div>
    </div>
  );
}
