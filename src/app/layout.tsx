import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Providers from '@/components/layout/Providers';
import DevicePathWidget from '@/components/debug/DevicePathWidget';

export const metadata: Metadata = {
  title: 'UYAN.chat — Свет внутри',
  description:
    'Анонимная платформа взаимопомощи. Дай свет — получи свет. Делитесь переживаниями, поддерживайте других и собирайте сад света.',
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
              className="flex-1 px-4 sm:px-6 lg:px-8"
              style={{ paddingTop: 'var(--header-h)', paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
        <DevicePathWidget />
      </body>
    </html>
  );
}
