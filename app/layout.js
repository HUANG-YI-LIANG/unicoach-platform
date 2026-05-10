import './globals.css';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { AuthProvider } from '@/components/AuthProvider';
import ConditionalShell from '@/components/ConditionalShell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Suspense } from 'react';

export const metadata = {
  title: 'UniCoach',
  description: '手機優先的運動教練預約平台',
};

export default function RootLayout({ children }) {
  const session = null;

  const headerEl = <Header />;

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
          <div className="mobile-container">
            <AuthProvider initialSession={session}>
              <ConditionalShell header={headerEl} navigation={navigationEl}>
                <Suspense fallback={null}>
                  {children}
                </Suspense>
              </ConditionalShell>
            </AuthProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
