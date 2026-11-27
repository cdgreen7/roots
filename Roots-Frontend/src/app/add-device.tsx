import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, globalStyles } from '@/styles/global';
import { apiRequest } from '../api/client';
import { usePlants } from './context';

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

type LinkResponse = { plant_id: string; linked: boolean };

/*
  AddDeviceScreen links a board to the logged-in account with POST /link.
  The board has to be powered on and connected to Wi-Fi first: the API rejects IDs it has never heard from.
*/
export default function AddDeviceScreen() {
  const router = useRouter();
  const { loadPlants } = usePlants();

  const [deviceId, setDeviceId] = useState('');
  const [plantName, setPlantName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    const id = deviceId.trim().toLowerCase(); // the board prints its ID in lowercase
    const name = plantName.trim();

    if (!DEVICE_ID_PATTERN.test(id)) {
      Alert.alert('Check the device ID', "It looks like roots-a1b2c3. It's shown on the board's Wi-Fi setup page.");
      return;
    }
    if (!name) {
      Alert.alert('Missing name', 'Give your plant a name.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest<LinkResponse>('/link', {
        method: 'POST',
        body: { device_id: id, plant_name: name },
      });
      await loadPlants(); // so Home and Data show the new plant straight away
      setLoading(false);
      router.back();
    } catch (error) {
      setLoading(false);
      Alert.alert(
        'Could not add device',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      );
    }
  };

  return (
    <View style={[globalStyles.container, styles.container]}>
      <Text style={styles.intro}>
        Power on your Roots board and connect it to Wi-Fi, then enter its device ID and a name for the plant.
      </Text>

      <Text style={styles.label}>Device ID</Text>
      <TextInput
        style={styles.input}
        placeholder='roots-a1b2c3'
        placeholderTextColor='#666'
        value={deviceId}
        onChangeText={setDeviceId}
        autoCapitalize='none'
        autoCorrect={false}
      />

      <Text style={styles.label}>Plant name</Text>
      <TextInput
        style={styles.input}
        placeholder='Basil'
        placeholderTextColor='#666'
        value={plantName}
        onChangeText={setPlantName}
        maxLength={100}
      />

      <TouchableOpacity style={styles.button} onPress={handleLink} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Add device</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  intro: {
    fontSize: 16,
    color: colors.header,
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.header,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 18,
  },
  button: {
    backgroundColor: colors.text,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});