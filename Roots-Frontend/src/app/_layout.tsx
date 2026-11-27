import { Stack } from 'expo-router';
import { PlantProvider } from './context';

export default function RootLayout() {
  // PlantProvider wraps every screen, so screens outside the tabs (like Add device) share the same plant list.
  return (
    <PlantProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='login' />
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='add-device' options={{ presentation: 'modal', headerShown: true, title: 'Add device', headerTransparent: false }} />
      </Stack>
    </PlantProvider>
  );
}