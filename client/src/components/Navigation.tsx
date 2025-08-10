import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Mail, Settings, LogOut } from "lucide-react";

interface NavigationProps {
  authenticated?: boolean;
  admin?: boolean;
}

export function Navigation({ authenticated = false, admin = false }: NavigationProps) {
  const { user } = useAuth();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <nav className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href={authenticated ? "/dashboard" : "/"}>
              <div className="flex-shrink-0 flex items-center cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IMS</span>
                </div>
                <span className="ml-3 text-xl font-semibold text-slate-900">
                  {admin ? "Admin Panel" : "Inmate Mail Service"}
                </span>
              </div>
            </Link>
          </div>
          
          {!authenticated ? (
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#home" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Home
                </a>
                <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  How it Works
                </a>
                <a href="#pricing" className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Pricing
                </a>
              </div>
            </div>
          ) : (
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/dashboard">
                  <span className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                    Dashboard
                  </span>
                </Link>
                <Link href="/compose">
                  <span className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                    Compose
                  </span>
                </Link>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <span className="text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer">
                      Admin
                    </span>
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            {!authenticated ? (
              <>
                <Button variant="ghost" onClick={handleLogin}>
                  Sign In
                </Button>
                <Button onClick={handleLogin}>
                  Get Started
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-slate-600 hidden sm:block">
                  {user?.firstName} {user?.lastName}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button type="button" className="text-slate-600 hover:text-slate-900 p-2">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
