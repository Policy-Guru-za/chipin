import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-subtle">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
