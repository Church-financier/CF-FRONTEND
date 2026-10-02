import type { Metadata } from 'next';
import { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Authentication | Church Financier',
  description: 'Sign in or create an account to access Church Financier',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
