import { SidebarLayout } from '@/components/SidebarLayout';

export default function TradingLayout({ children }: { children: React.ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
