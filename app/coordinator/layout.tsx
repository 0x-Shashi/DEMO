import CoordinatorLayout from '@/components/layout/CoordinatorLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CoordinatorLayout>{children}</CoordinatorLayout>;
}
