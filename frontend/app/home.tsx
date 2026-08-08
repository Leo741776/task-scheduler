import { Redirect } from 'expo-router';

import CalendarScreen from '../src/view/screens/CalendarScreen/CalendarScreen';
import { useAuth } from '../src/viewmodel/hooks/useAuth';

export default function Home() {
  const { user, token } = useAuth();

  if (!user || !token) {
    return <Redirect href="/" />;
  }

  return <CalendarScreen />;
}
