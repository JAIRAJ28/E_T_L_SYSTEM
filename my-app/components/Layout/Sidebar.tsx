"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NavItem = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-sky-200 text-slate-900"
          : "text-slate-700 hover:bg-sky-100 hover:text-slate-900"
      }`}
    >
      {label}
    </Link>
  );
};

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-sky-200 bg-white">
      <div className="p-4">
        <div className="text-xs uppercase tracking-wider text-slate-600 mb-3">
          Navigation
        </div>
        <div className="space-y-1">
          <NavItem href="/import-history" label="Import History" />
        </div>
      </div>
    </aside>
  );
}
