import { getToastAnnouncementText } from './toastTheme';
import type { Toast } from './toastTypes';

type Props = {
  toasts: Toast[];
};

export function ToastLiveRegions({ toasts }: Props) {
  const politeToasts = toasts.filter((toastRecord) => toastRecord.type !== 'error');
  const assertiveToasts = toasts.filter((toastRecord) => toastRecord.type === 'error');

  return (
    <div className="sr-only">
      <div aria-live="polite" aria-atomic="false" aria-relevant="additions text">
        {politeToasts.map((toastRecord) => (
          <p key={toastRecord.id}>{getToastAnnouncementText(toastRecord)}</p>
        ))}
      </div>
      <div aria-live="assertive" aria-atomic="false" aria-relevant="additions text">
        {assertiveToasts.map((toastRecord) => (
          <p key={toastRecord.id}>{getToastAnnouncementText(toastRecord)}</p>
        ))}
      </div>
    </div>
  );
}
