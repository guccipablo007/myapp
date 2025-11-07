import './globals.css';
import UserBar from '@/components/UserBar';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Camsu Connect',
  description: 'Community management app for CAMSU members',
};

// ✅ Only this one default export
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <UserBar />
      </body>
    </html>
  );
}
