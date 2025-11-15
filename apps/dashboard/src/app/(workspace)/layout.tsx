"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { workspaceSections } from "@/lib/workspace";

const profile = {
  name: "Alon Rom",
  role: "WorkItem Orchestrator",
  avatar: "/profile.jpeg",
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;
    const minWidth = 260;
    const maxWidth = 480;
    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.min(
        maxWidth,
        Math.max(minWidth, event.clientX),
      );
      setSidebarWidth(nextWidth);
    };
    const stop = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [isResizing]);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top,_#3a0ca3_0%,_#0b0221_45%,_#050111_80%)] text-white">
      <aside
        className="hidden flex-col border-r border-white/10 bg-white/5 px-6 py-8 backdrop-blur-xl md:flex"
        style={{ width: sidebarWidth }}
      >
        <h1 className="text-2xl font-semibold tracking-[0.25em] text-white">
          WORKFLOW.AI
        </h1>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="relative h-24 w-24">
            <Image
              src={profile.avatar}
              alt={profile.name}
              fill
              priority
              sizes="96px"
              className="rounded-full border border-white/20 object-cover shadow-lg shadow-purple-900/60"
            />
          </div>
          <p className="mt-4 text-base font-semibold">{profile.name}</p>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {profile.role}
          </p>
        </div>

        <nav className="mt-10 space-y-2">
          {workspaceSections.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`relative flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-white/30 bg-gradient-to-r from-white/30 to-white/10 text-white shadow-lg shadow-purple-500/40"
                    : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div
        className="hidden cursor-col-resize items-center justify-center px-1 md:flex"
        onMouseDown={() => setIsResizing(true)}
      >
        <span
          className={`h-28 w-1 rounded-full bg-white/20 transition ${isResizing ? "bg-white/60" : "hover:bg-white/40"}`}
        />
      </div>

      <main className="flex flex-1 flex-col gap-8 px-5 py-8 md:px-10">
        {children}
      </main>
    </div>
  );
}

