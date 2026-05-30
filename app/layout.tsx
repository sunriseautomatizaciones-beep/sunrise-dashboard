import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Sunrise Dashboard — 0 → 10.000€',
  description: 'Panel de operaciones de Sunrise Automatizaciones',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex h-screen overflow-hidden bg-[#0F172A]">
        <Sidebar />
        {/* pb-16 on mobile to avoid content hidden behind bottom nav */}
        <main className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
