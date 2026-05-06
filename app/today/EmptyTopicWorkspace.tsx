'use client';

import { elevatedPanelClass, inputClass, primaryButtonClass, sectionLabelClass } from './WorkspaceHeaderPrimitives';

export function EmptyTopicWorkspace() {
  return (
    <main className="min-h-screen pb-12">
      <div className="mx-auto max-w-[1480px] px-4 py-10 sm:px-6 lg:px-10">
        <section id="today-hero" className="flex flex-col items-center pt-8 text-center lg:pt-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[color:var(--today-muted-strong)]">
            CONCEPT VAULT RESEARCH CORE
          </p>
          <h1 className="mt-6 text-[clamp(2.75rem,6vw,5.75rem)] font-black tracking-[-0.08em] text-[color:var(--today-accent-strong)]">
            EVIDENCE_REVIEW
          </h1>
          <div className={`${elevatedPanelClass} mt-10 w-full max-w-[860px] rounded-[32px] px-6 py-7 sm:px-8`}>
            <p className={sectionLabelClass}>Initialize workspace</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--today-muted)]">
              Create the first topic to start collecting proposals, reviewing evidence, and generating reports inside this surface.
            </p>
            <form action="/api/topics" method="POST" className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-[color:var(--today-text)]">
                  Topic name
                </label>
                <input id="name" name="name" required className={inputClass} placeholder="Multi-agent AI research" />
              </div>
              <div className="space-y-2">
                <label htmlFor="focusTags" className="text-sm font-medium text-[color:var(--today-text)]">
                  Focus tags
                </label>
                <input id="focusTags" name="focusTags" className={inputClass} placeholder="agents, evaluation, orchestration" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="goal" className="text-sm font-medium text-[color:var(--today-text)]">
                  Research brief
                </label>
                <textarea
                  id="goal"
                  name="goal"
                  required
                  rows={5}
                  className={`${inputClass} !rounded-[28px] !py-4`}
                  placeholder="Track evidence, trace sources, and synthesize trustworthy findings."
                />
              </div>
              <div className="md:col-span-2">
                <button type="submit" className={primaryButtonClass}>
                  Create first topic
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
