import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, BookOpen, Wallet, BarChart3 } from "lucide-react";

const tabs = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/drivers", icon: Users, label: "Fleet" },
  { to: "/accounting", icon: BookOpen, label: "Entries" },
  { to: "/settlements", icon: Wallet, label: "Pay" },
  { to: "/analytics", icon: BarChart3, label: "Insights" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="mx-auto flex max-w-lg items-center justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                isActive ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
