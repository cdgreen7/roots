import { globalStyles } from '@/styles/global';
import { Text, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import HomeHeader from '../../components/HomeHeader';
import { usePlants } from '../context';
import { useCallback, useEffect, useState } from 'react';
import { useRefreshWhileFocused } from '../../hooks/useRefreshWhileFocused';
import { PlantAlert, getAlerts } from '../../api/alerts';

export default function HomeScreen() {

  // Retrieve shared plant data from Context
  const router = useRouter();
  const { plants, loading, loadPlants } = usePlants();

    // Load plants when the dashboard opens (it's the first tab after login), with the loading state.
  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  // after load, quietly refresh them when Home comes back into view and every 30 s.
  const refreshPlants = useCallback(() => { loadPlants(true); }, [loadPlants]);
  useRefreshWhileFocused(refreshPlants, 30_000);

  // What's wrong with each unhealthy plant (GET /alerts), keyed by plant id.
  const [alertsByPlant, setAlertsByPlant] = useState<Record<string, PlantAlert[]>>({});
  useEffect(() => {
    const unhealthy = plants.filter(plant => plant.health === 'unhealthy');
    let cancelled = false;
    Promise.all(unhealthy.map(plant => getAlerts(plant.id).catch(() => [] as PlantAlert[])))
      .then(lists => {
        if (!cancelled) setAlertsByPlant(Object.fromEntries(unhealthy.map((plant, i) => [plant.id, lists[i]])));
      });
    return () => { cancelled = true; };
  }, [plants]);

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


      {/* First run: no boards linked yet */}
      {!loading && plantCount === 0 && (
        <Pressable style={styles.addCard} onPress={() => router.push('/add-device')}>
          <Ionicons name='leaf-outline' size={28} color='#27641f' />
          <Text style={styles.addCardTitle}>No plants yet</Text>
          <Text style={styles.addCardText}>Tap here to add your Roots board.</Text>
        </Pressable>
      )}


      {/* Plant Care */}
      <View>
        <Text style={globalStyles.sectionTitle}>Plant Care</Text>
        {unhealthyPlants.length > 0 ? (
          unhealthyPlants.map(plant => (
            <View key={plant.id} style={styles.plantCard}>
              <Text style={styles.plantName}>
                {plant.name}
              </Text>
                {(alertsByPlant[plant.id] ?? []).map(alert => (
                <Text key={alert.type}>{alert.message}</Text>
              ))}
            </View>
          ))
        ) : (
          <Text>All your plants are healthy!</Text>
        )}

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
  addCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    alignItems: 'center',
  },
  addCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27641f',
    marginTop: 8,
  },
  addCardText: {
    fontSize: 15,
    color: '#338a36',
    marginTop: 4,
  },
});
