'use client';

import { useEffect, useState } from 'react';
import type { OverlayKind } from './overlaySurfaceTypes';

export function useOverlayPortal(kind: OverlayKind) {
  const [portalNode, setPortalNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const node = document.createElement('div');
    node.dataset.overlaySurface = kind;
    document.body.appendChild(node);
    setPortalNode(node);

    return () => {
      node.remove();
      setPortalNode(null);
    };
  }, [kind]);

  return portalNode;
}
