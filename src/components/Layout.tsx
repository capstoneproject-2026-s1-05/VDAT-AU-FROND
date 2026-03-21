import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Activity, Database, GitCompare,
  Menu, Globe, Zap, Dumbbell, Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Navigation structure definition
const navSections = [
  {
    title: 'Overview',
    items: [
      { path: '/', label: 'Home', icon: Activity },
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Physical Performance',
    items: [
      { path: '/training-load', label: 'Training Load', icon: Zap },
      { path: '/strength-power', label: 'Strength & Power', icon: Dumbbell },
      { path: '/recovery', label: 'Recovery & Wellness', icon: Heart },
    ],
  },
  {
    title: 'Competition',
    items: [
      { path: '/fivb-live', label: 'FIVB Live Data', icon: Globe },
      { path: '/compare', label: 'Compare', icon: GitCompare },
    ],
  },
  {
    title: 'Data',
    items: [
      { path: '/sources', label: 'Data Sources', icon: Database },
    ],
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col',
        'border-r border-border bg-sidebar transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-border">
          <span className="font-heading font-bold text-lg text-primary">VDAT</span>
          <span className="text-xs text-muted-foreground ml-2">v1.0</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navSections.map(section => (
            <div key={section.title}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ icon: Icon, path, label }) => {
                  const active = location === path;
                  return (
                    <Link key={path} href={path}>
                      <div className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                      )}>
                        <Icon className="w-4 h-4" />
                        {label}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content area */}
      <main className="flex-1 min-h-screen overflow-x-hidden">
        {/* Mobile header bar */}
        <div className="lg:hidden h-14 flex items-center px-4 border-b border-border">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-heading font-bold text-primary ml-3">VDAT</span>
        </div>
        {children}
      </main>
    </div>
  );
}