import { globalStyles } from '@/styles/global';
import { Link } from 'expo-router';
import { Text, ScrollView } from 'react-native';
import HomeHeader from '../../components/HomeHeader';

export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Roots Dashboard</Text>
     <HomeHeader />

    // progress bars for metrics?

    </ScrollView>
  );
}