import '@/global.css';
import React, { useState } from 'react';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function App({children}: {children: React.ReactNode}) {
  return (
    <SafeAreaView className="flex-1 justify-center items-center">
      <GluestackUIProvider mode='system'>
        {children}
      </GluestackUIProvider>
    </SafeAreaView>
  );
}

