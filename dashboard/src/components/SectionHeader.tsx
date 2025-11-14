"use client";

import { Sparkles } from "lucide-react";

type SectionHeaderProps = {
  tag: string;
  title: string;
  description: string;
};

export function SectionHeader({ tag, title, description }: SectionHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.4em] text-purple-200">
        Live beta
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div>
        <p className="text-sm uppercase tracking-[0.4em] text-white/60">
          {tag}
        </p>
        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
          {title}
        </h2>
        <p className="text-base text-white/70">{description}</p>
      </div>
    </header>
  );
}

