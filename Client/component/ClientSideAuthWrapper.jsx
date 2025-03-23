'use client'
import { usePathname } from 'next/navigation';
import AuthGuard from '@/component/AuthGuide';

export default function ClientSideAuthWrapper({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/signin' || pathname === '/signup';
  
  if (isAuthPage) {
    return children;
  }
  
  return <AuthGuard>{children}</AuthGuard>;
}