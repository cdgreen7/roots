import { Redirect } from 'expo-router';
import { globalStyles } from '@/styles/global';
import { Text, ScrollView, View, StyleSheet } from 'react-native';
import HomeHeader from '../../components/HomeHeader';

export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Roots Dashboard</Text>
      <HomeHeader />

      {/* home summary*/}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionContent}>
          list of alerts
        </Text>
      </View>
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>All Plants</Text>
        <Text style={globalStyles.sectionContent}>
          swipe through your plants to see their details and care instructions
        </Text>
      </View>

      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>See Friends' Posts</Text>
        <Text style={globalStyles.sectionContent}>
          top posts,

          see all posts / all friends link
        </Text>
      </View>
    </ScrollView>
  );
}