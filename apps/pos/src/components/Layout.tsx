import { useLiveQuery } from 'dexie-react-hooks';
import { Armchair, BarChart3, CloudOff, LayoutGrid, ListOrdered, LogOut, RefreshCw, Settings, ShieldCheck, Users, Utensils, Wifi } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cache } from '../lib/db';
import { cn } from '../lib/format';
import { flush, useSync } from '../lib/sync';
import { useAuth } from '../store/auth';

/**
 * App shell. Desktop/tablet (md+): one top bar with the nav inline.
 * Phone: slim top bar (name, sync status, logout) + bottom tab bar, hidden on the order screen to give it the full height.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, can, overrideBy } = useAuth();
  const { online, pending, rejected, syncing } = useSync();
  const outlet = useLiveQuery(() => cache.outlet());
  const onOrderScreen = useLocation().pathname.startsWith('/order/');
  useEffect(() => {
    if (outlet?.name) document.title = `${outlet.name} POS`;
  }, [outlet?.name]);
  const nav = [
    { to: '/', icon: LayoutGrid, label: 'Tables', show: true },
    { to: '/orders', icon: ListOrdered, label: 'Orders', show: true },
    { to: '/reports', icon: BarChart3, label: 'Reports', show: can('reports.read') },
    { to: '/admin/menu', icon: Utensils, label: 'Menu', show: can('menu.write') },
    { to: '/admin/tables', icon: Armchair, label: 'Floor', show: can('tables.write') },
    { to: '/admin/staff', icon: Users, label: 'Staff', show: can('users.manage') },
    { to: '/admin/settings', icon: Settings, label: 'Settings', show: can('settings.write') },
  ].filter((n) => n.show);
  return (
    <div className="flex h-full flex-col">
      <header className="no-print flex h-12 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 md:gap-3">
        <div className="min-w-0 truncate font-bold tracking-tight md:mr-2 md:shrink-0">
          <span className="text-brand-500">{outlet?.name ?? 'Restaurant'}</span> <span className="hidden text-slate-400 sm:inline">POS</span>
        </div>
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              title={n.label}
              className={({ isActive }) => cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm', isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white')}
            >
              <n.icon size={16} /> <span className="hidden xl:inline">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1 text-xs sm:gap-2">
          {overrideBy && (
            <span className="flex items-center gap-1 rounded bg-purple-900/60 px-2 py-1 text-purple-200" title={`Override: ${overrideBy}`}>
              <ShieldCheck size={14} /> <span className="hidden sm:inline">Override: {overrideBy}</span>
            </span>
          )}
          <NavLink
            to="/sync"
            className={cn('flex items-center gap-1.5 rounded-md px-2 py-1', online ? 'text-emerald-400' : 'bg-red-900/50 text-red-300')}
            title={online ? 'Online' : 'Offline — orders are queued locally'}
          >
            {online ? <Wifi size={14} /> : <CloudOff size={14} />}
            <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
            {(pending > 0 || rejected > 0) && (
              <span className={cn('rounded-full px-1.5 text-[10px] font-bold', rejected ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950')}>{pending + rejected}</span>
            )}
          </NavLink>
          <button onClick={() => flush()} className="rounded p-1.5 text-slate-400 hover:text-white" title="Sync now">
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          </button>
          <span className="hidden text-slate-400 lg:inline">
            {user?.name} · {user?.role}
          </span>
          <button onClick={logout} className="rounded p-1.5 text-slate-400 hover:text-white" title={`Logout ${user?.name ?? ''}`}>
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
      {!onOrderScreen && (
        <nav className="no-print flex shrink-0 border-t border-slate-800 bg-slate-900 pb-[env(safe-area-inset-bottom)] md:hidden">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => cn('flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px]', isActive ? 'text-brand-400' : 'text-slate-400')}
            >
              <n.icon size={20} />
              <span className="truncate">{n.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
