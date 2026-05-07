'use client';

import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './WorkspaceHeaderPrimitives';

type Props = {
  onCancel: () => void;
};

export function TopicCreateForm({ onCancel }: Props) {
  return (
    <form action="/api/topics" method="POST" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Topic name" className={inputClass} />
        <input name="focusTags" placeholder="Focus tags" className={inputClass} />
      </div>
      <textarea
        name="goal"
        required
        rows={3}
        placeholder="What should this topic track?"
        className={`${inputClass} !rounded-[24px] !py-4`}
      />
      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButtonClass}>
          Create topic
        </button>
        <button type="button" onClick={onCancel} className={secondaryButtonClass}>
          Cancel
        </button>
      </div>
    </form>
  );
}
