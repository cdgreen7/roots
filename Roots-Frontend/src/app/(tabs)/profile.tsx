import { useCallback } from 'react';
import { useRefreshWhileFocused } from '../../hooks/useRefreshWhileFocused';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { globalStyles } from '@/styles/global';
import { getCurrentUser, signOut } from '../../api/session';
import { usePlants } from '../context';


/*
  ProfileScreen shows the logged-in account and the plants linked to it.
*/
export default function ProfileScreen() {
  const router = useRouter();
  const user = getCurrentUser();
  const { plants, setPlants, loadPlants } = usePlants();
  // Refresh the plant list (and each board's online status) when Profile opens and every 30 s while it's open.
  const refreshPlants = useCallback(() => { loadPlants(true); }, [loadPlants]);
  useRefreshWhileFocused(refreshPlants, 30_000);

  const handleSignOut = () => {
    signOut();
    setPlants([]); // don't show this account's plants to the next person who signs in
    router.replace('/login');
  };
   
  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Profile</Text>

      {/* Account */}
      {user && (
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.detail}>@{user.username}</Text>
          <Text style={styles.detail}>{user.email}</Text>
        </View>
      )}

      {/* Plants */}
      <Text style={globalStyles.sectionTitle}>My plants</Text>
      {plants.length === 0 ? (
        <Text style={styles.detail}>No plants yet.</Text>
      ) : (
        plants.map(plant => (
          <View key={plant.id} style={styles.plantRow}>
            <View style={[styles.dot, plant.online ? styles.dotOnline : styles.dotOffline]} />
            <View style={styles.plantText}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.detail}>
                {plant.device_id} · {plant.online ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        ))
      )}
      {/* Buttons */}
      <Pressable style={styles.addButton} onPress={() => router.push('/add-device')}>
        <Ionicons name='add-circle-outline' size={22} color='#fff' />
        <Text style={styles.addButtonText}>Add device</Text>
      </Pressable>
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27641f',
  },
  detail: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
  },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  dotOnline: {
    backgroundColor: '#338a36',
  },
  dotOffline: {
    backgroundColor: '#bbb',
  },
  plantText: {
    flex: 1,
  },
  plantName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#242444',
  },
  addButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#27641f',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  signOutButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 24,
    marginBottom: 40,
  },
  signOutText: {
    color: '#ff5252',
    fontSize: 16,
    fontWeight: '600',
  },
});