import './globals.css';
import Navigation from '@/components/Navigation';
import Header from '@/components/Header';
import { AuthProvider } from '@/components/AuthProvider';
import ConditionalShell from '@/components/ConditionalShell';
import { getSession } from '@/lib/auth';

export const metadata = {
  title: 'UniCoach',
  description: '手機優先的運動教練預約平台',
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  const headerEl = <Header />;

  const navigationEl = <Navigation />;

  return (
    <html lang="zh-TW">
      <body>
        <div className="mobile-container">
          <AuthProvider initialSession={session}>
            <ConditionalShell header={headerEl} navigation={navigationEl}>
              {children}
            </ConditionalShell>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
