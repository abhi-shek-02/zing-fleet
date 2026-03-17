import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (login(pin)) {
      navigate("/");
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
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
            className="text-center text-lg tracking-[0.5em] h-12"
            maxLength={6}
          />
          {error && <p className="text-xs text-destructive text-center">Invalid PIN. Try 1234.</p>}
          <Button onClick={handleLogin} className="w-full h-11" disabled={!pin}>
            Unlock
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Default PIN: 1234</p>
      </div>
    </div>
  );
}
