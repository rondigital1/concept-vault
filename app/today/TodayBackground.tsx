'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const RomanNumeralsBackground = dynamic(
  () => import('@/app/components/RomanNumeralsBackground'),
  { ssr: false, loading: () => null }
);

export function TodayBackground() {
  useEffect(() => {
    console.log('TodayBackground mounted');
  }, []);

  return <RomanNumeralsBackground />;
}
