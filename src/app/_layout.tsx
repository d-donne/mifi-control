import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import '@/global.css';
import { Text } from 'react-native';

export default function RootLayout({children}: {children: React.ReactNode}) {
  return <GluestackUIProvider>
    {children}
  </GluestackUIProvider>
}
