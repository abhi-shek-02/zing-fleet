import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Truck, BookOpen, CreditCard, BarChart3 } from "lucide-react";

const tabs = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/drivers", icon: Truck, label: "Fleet" },
  { to: "/accounting", icon: BookOpen, label: "Entries" },
  { to: "/settlements", icon: CreditCard, label: "Pay" },
  { to: "/analytics", icon: BarChart3, label: "Insights" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
