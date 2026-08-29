import type { Metadata } from 'next';
import { AdminLayout } from '@/components/AdminLayout';
import { Providers } from '@/components/Providers';
import { ThemeRegistry } from '@/components/ThemeRegistry';

export const metadata: Metadata = {
  title: 'Docs Flow — Admin',
  description: 'Painel administrativo de workflows de documentos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeRegistry>
          <Providers>
            <AdminLayout>{children}</AdminLayout>
          </Providers>
        </ThemeRegistry>
      </body>
    </html>
  );
}
