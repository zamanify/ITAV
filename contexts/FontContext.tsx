import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Unbounded_400Regular, Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { SplashScreen } from 'expo-router';

const fontFamilies = {
  poppinsRegular: 'Poppins-Regular',
  poppinsSemiBold: 'Poppins-SemiBold',
  unboundedRegular: 'Unbounded-Regular',
  unboundedSemiBold: 'Unbounded-SemiBold',
};

interface FontContextValue {
  fonts: typeof fontFamilies;
}

const FontContext = createContext<FontContextValue>({ fonts: fontFamilies });

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    [fontFamilies.poppinsRegular]: Poppins_400Regular,
    [fontFamilies.poppinsSemiBold]: Poppins_600SemiBold,
    [fontFamilies.unboundedRegular]: Unbounded_400Regular,
    [fontFamilies.unboundedSemiBold]: Unbounded_600SemiBold,
  });

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <FontContext.Provider value={{ fonts: fontFamilies }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFontFamilies() {
  return useContext(FontContext).fonts;
}
