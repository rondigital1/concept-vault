import { RouteStatusShell } from './components/RouteStatusShell';

export default function NotFound() {
  return (
    <RouteStatusShell
      eyebrow="Route missing"
      title="This surface is not available."
      description="The requested page could not be found, or the record was removed before the route resolved."
      tone="warning"
      links={[
        { href: '/today', label: 'Open Research' },
        { href: '/library', label: 'Open Library', variant: 'secondary' },
      ]}
    />
  );
}
