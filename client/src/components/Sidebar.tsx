import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Database, 
  Menu,
  MessageSquare,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Sidebar() {
  const [location] = useLocation();
  const links = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/quote-requests", icon: MessageSquare, label: "Quote Requests" },
    { href: "/admin/pricing", icon: DollarSign, label: "Pricing & Restrictions" },
  ];

  // Fetch product count
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) return [];
      return response.json();
    },
  });

  const activeCount = products.filter(p => p.status === 'active').length;

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-bold text-primary text-xl">
          <Database className="h-6 w-6" />
          <span>ViaScraper</span>
        </div>
      </div>
      <div className="flex-1 px-4 py-4">
        <nav className="flex flex-col gap-2">
          {links.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                location === link.href 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="text-xs font-medium text-muted-foreground">Database Status</div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-bold">{products.length}</span>
            <span className="text-xs text-green-600">{activeCount} Active</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
            <div 
              className="h-full rounded-full bg-primary"
              style={{ width: products.length > 0 ? `${(activeCount / products.length) * 100}%` : '0%' }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 flex-col border-r bg-sidebar md:flex">
        <SidebarContent />
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-4 left-4 z-40">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}