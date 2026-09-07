import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Remaining Thermal Life Route Prioritiser | Dairy Milk Collection',
  description: 'Academic Prototype Dashboard for Thermal-Life-Aware Milk Collection Route Planning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-sky-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
