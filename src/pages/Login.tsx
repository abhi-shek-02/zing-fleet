import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    if (login(pin)) {
      navigate("/");
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-xs space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">ZingCab Fleet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin Login</p>
        </div>

        <div className="space-y-4">
          <Input
            type="password"
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="text-center text-lg tracking-widest"
            maxLength={6}
          />
          {error && <p className="text-center text-sm text-destructive">Invalid PIN. Try 1234.</p>}
          <Button className="w-full" onClick={handleLogin}>
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}
