import React from 'react';
import { SidebarLayout } from '@/components/SidebarLayout';

export default function PairsLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
