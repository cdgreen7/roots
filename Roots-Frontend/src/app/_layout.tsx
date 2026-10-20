import { Stack } from 'expo-router';
import { ScheduleProvider } from '@/state/schedule';

export default function RootLayout() {
  return (
    <ScheduleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(tabs)' />
      </Stack>
    </ScheduleProvider>
  );
}
