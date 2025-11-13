import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MobileNavBar } from '@/components/layout/MobileNavBar';
import Providers from '@/components/layout/Providers';
import DevicePathWidget from '@/components/debug/DevicePathWidget';
import PageTransition from '@/components/layout/PageTransition';

export const metadata: Metadata = {
  title: 'UYAN.chat — пространство тёплых мыслей',
  description:
    'Анонимное пространство нового интернета: делись мыслями, получай бережные ответы и храни важные слова в архиве — без шума и гонки за лайками.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark h-full">
      <body className="min-h-dvh bg-bg-primary text-text-primary">
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <Header />
            <main
              className="flex-1 min-h-screen px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0 sm:px-6 lg:px-8"
              style={{ paddingTop: 'var(--header-h)' }}
            >
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
            <MobileNavBar />
          </div>
        </Providers>
        <DevicePathWidget />
      </body>
    </html>
  );
}
