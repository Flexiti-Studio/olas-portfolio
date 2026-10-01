import { SidebarLayout } from '@/components/SidebarLayout';

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
