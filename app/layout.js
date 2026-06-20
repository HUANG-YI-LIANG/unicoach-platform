import './globals.css';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { AuthProvider } from '@/components/AuthProvider';
import ConditionalShell from '@/components/ConditionalShell';
import SupportChatWidget from '@/components/SupportChatWidget';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AdminModeProvider } from '@/components/AdminModeContext';
import { Suspense } from 'react';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'UniCoach',
  description: '手機優先的教練與老師預約平台',
  appleWebApp: {
    capable: true,
    title: 'UniCoach',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  const session = null;

  const headerEl = null;

  const navigationEl = <Navigation />;

  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('app-theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AdminModeProvider>
            <AuthProvider initialSession={session}>
              <ConditionalShell header={headerEl} navigation={navigationEl}>
                <Suspense fallback={null}>
                  {children}
                </Suspense>
              </ConditionalShell>
              <SupportChatWidget />
              <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
            </AuthProvider>
          </AdminModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
