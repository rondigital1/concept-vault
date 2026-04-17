import { RouteStatusShell } from './components/RouteStatusShell';

function LoadingPulse() {
  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm text-[#ddd7d7]">
      <span className="h-3 w-3 animate-pulse rounded-full bg-[#b9dce2]" />
      Preparing route workspace
    </div>
  );
}

export default function Loading() {
  return (
    <RouteStatusShell
      eyebrow="Loading route"
      title="Preparing the next workspace."
      description="The application shell is resolving navigation state and loading the route payload."
      actions={<LoadingPulse />}
      links={[
        { href: '/today', label: 'Open Research', variant: 'secondary' },
      ]}
    />
  );
}
