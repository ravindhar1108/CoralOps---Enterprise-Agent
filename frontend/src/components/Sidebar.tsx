"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, GitMerge, Settings, Code2 } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent", label: "Agent", icon: MessageSquare },
    { href: "/workflow", label: "Workflow", icon: GitMerge },
    { href: "/analyze", label: "Analyse Your Project", icon: Settings },
  ];

  return (
    <aside className="w-16 md:w-64 h-screen bg-[#0a0a0a] border-r border-[#1e1e1e] flex flex-col items-center md:items-start flex-shrink-0 transition-all duration-300">
      <div className="w-full flex items-center justify-center md:justify-start h-16 border-b border-[#1e1e1e] md:px-6">
        <Code2 className="w-8 h-8 text-indigo-500" />
        <span className="hidden md:block ml-3 font-bold text-lg text-white tracking-wide">CoralOps</span>
      </div>
      
      <nav className="flex-1 w-full flex flex-col gap-2 mt-6 px-2 md:px-4">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link 
              key={link.href} 
              href={link.href}
              className={`flex items-center justify-center md:justify-start w-full h-12 md:h-10 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400" 
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto">
                <Icon className={`w-5 h-5 md:w-4 md:h-4 ${isActive ? "text-indigo-400" : ""}`} />
              </div>
              <span className="hidden md:block md:ml-3 text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 w-full border-t border-[#1e1e1e]">
        <div className="w-8 h-8 md:w-full md:h-auto rounded-full md:rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center md:justify-start md:px-3 md:py-2">
          <div className="w-full hidden md:flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></div>
            <span className="text-xs text-white font-medium">Coral Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
