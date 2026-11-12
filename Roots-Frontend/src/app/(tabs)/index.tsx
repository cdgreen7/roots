import { globalStyles } from '@/styles/global';
import { Text, ScrollView, View, StyleSheet, FlatList, ImageBackground } from 'react-native';
import HomeHeader from '../../components/HomeHeader';

export default function HomeScreen() {
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Roots Dashboard</Text>
      <HomeHeader />

      {/* home summary*/}
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: '#F0F0F0' }]}>
          <Text style={[styles.title, { color: '#666' }]}>
            Total Plants
          </Text>
          <Text style={styles.value}>
            3
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#FFF5EE' }]}>
          <Text style={[styles.title, { color: '#FF6B35' }]}>
            Needs Care
          </Text>
          <Text style={styles.value}>
            2
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.title, { color: '#338a36' }]}>
            Healthy Plants
          </Text>
          <Text style={styles.value}>
            1
          </Text>
        </View>
      </View>

      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>Plant Care</Text>
        <Text style={globalStyles.sectionContent}>
          swipe through your plants to see their details and care instructions
        </Text>
      </View>

    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 999,
    elevation: 3,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },

  
  careNow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },


  comingUp: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
});