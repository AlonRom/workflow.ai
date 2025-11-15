"use client";

type PlaceholderPanelProps = {
  sectionId: string;
  title: string;
  description: string;
};

export function PlaceholderPanel({
  sectionId,
  title,
  description,
}: PlaceholderPanelProps) {
  return (
    <section className="glass-panel flex flex-1 flex-col items-start justify-center gap-6 rounded-[36px] border border-white/10 bg-gradient-to-br from-white/5 to-white/0 px-10 py-12 text-left">
      <p className="text-xs uppercase tracking-[0.4em] text-white/50">
        {sectionId} preview
      </p>
      <h3 className="text-4xl font-semibold text-white">{title}</h3>
      <p className="max-w-2xl text-base text-white/70">{description}</p>
      <button
        type="button"
        className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40 hover:text-white"
      >
        Coming soon
      </button>
    </section>
  );
}

