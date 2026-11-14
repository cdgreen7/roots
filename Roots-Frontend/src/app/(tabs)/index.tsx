import { globalStyles } from '@/styles/global';
import { Text, ScrollView, View, StyleSheet } from 'react-native';
import HomeHeader from '../../components/HomeHeader';
import { usePlants } from '../context';

export default function HomeScreen() {

  // Retrieve shared plant data from Context
  const { plants } = usePlants();

  // Calculate plant counts
  const plantCount = plants.length;

  const unhealthyPlants = plants.filter(
    plant => plant.health === "unhealthy"
  );

  const unhealthyCount = unhealthyPlants.length;

  const healthyCount = plants.filter(
    plant => plant.health === "healthy"
  ).length;

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Roots Dashboard</Text>

      <HomeHeader />

      {/* Home summary */}
      <View style={styles.container}>

        <View style={[styles.card, { backgroundColor: '#F0F0F0' }]}>
          <Text style={[styles.title, { color: '#666' }]}>
            Total Plants
          </Text>
          <Text style={styles.value}>
            {plantCount}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: '#FFF5EE' }]}>
          <Text style={[styles.title, { color: '#FF6B35' }]}>
            Needs Care
          </Text>
          <Text style={styles.value}>
            {unhealthyCount}
          </Text>
        </View>

        

        <View style={[styles.card, { backgroundColor: '#E8F5E9' }]}>
          <Text style={[styles.title, { color: '#338a36' }]}>
            Healthy Plants
          </Text>
          <Text style={styles.value}>
            {healthyCount}
          </Text>
        </View>

      </View>

      {/* Plant Care */}
      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>Plant Care</Text>


        {unhealthyPlants.length > 0 ? (
          unhealthyPlants.map(plant => (
            <View key={plant.id} style={styles.plantCard}>
              <Text style={styles.plantName}>
                {plant.name}
              </Text>

              <Text>
                Soil Moisture: {plant.moisture}%
              </Text>

              <Text>
                Temperature: {plant.temperature}°C
              </Text>
            </View>
          ))
        ) : (
          <Text>All your plants are healthy!</Text>
        )}

      </View>

      <View style={globalStyles.section}>
        <Text style={globalStyles.sectionTitle}>Upcoming</Text>
        <Text>
          water scheduled that is close 
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
  plantCard: {
    backgroundColor: '#FFF5EE',
    padding: 15,
    borderRadius: 12,
    marginVertical: 6,
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
});
