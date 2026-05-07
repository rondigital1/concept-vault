import {
  workspaceEyebrowClassName,
  workspaceSectionLinkClassName,
} from './workspaceTheme';

type SectionIconName = 'overview' | 'registry' | 'controls' | 'runs';

const WORKSPACE_SECTIONS: Array<{
  href: string;
  label: string;
  icon: SectionIconName;
}> = [
  { href: '#agents-overview', label: 'Overview', icon: 'overview' },
  { href: '#agents-registry', label: 'Registry', icon: 'registry' },
  { href: '#agents-controls', label: 'Run Controls', icon: 'controls' },
  { href: '#agents-runs', label: 'Recent Runs', icon: 'runs' },
];

function SectionIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: SectionIconName;
  className?: string;
}) {
  if (name === 'overview') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5H18.5A1.5 1.5 0 0 1 20 6.5v11A1.5 1.5 0 0 1 18.5 19H5.5A1.5 1.5 0 0 1 4 17.5z" />
        <path d="M8 10.5h8" />
        <path d="M8 14.5h5" />
      </svg>
    );
  }

  if (name === 'registry') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M6 6h12" />
        <path d="M6 12h12" />
        <path d="M6 18h12" />
        <path d="M4 6h.01" />
        <path d="M4 12h.01" />
        <path d="M4 18h.01" />
      </svg>
    );
  }

  if (name === 'controls') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        aria-hidden="true"
      >
        <path d="M6 7h12" />
        <path d="M6 12h12" />
        <path d="M6 17h12" />
        <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
        <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
        <circle cx="11" cy="17" r="2" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      aria-hidden="true"
    >
      <path d="M7 6h10" />
      <path d="M7 12h10" />
      <path d="M7 18h10" />
      <path d="M5 6h.01" />
      <path d="M5 12h.01" />
      <path d="M5 18h.01" />
    </svg>
  );
}

export function AgentsChromeSectionLinks({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {!compact ? <div className={workspaceEyebrowClassName}>Jump To</div> : null}
      <div className={compact ? 'flex min-w-max gap-2' : 'mt-4 space-y-1'}>
        {WORKSPACE_SECTIONS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className={workspaceSectionLinkClassName(compact)}
          >
            <SectionIcon name={section.icon} />
            <span>{section.label}</span>
          </a>
        ))}
      </div>
    </>
  );
}
