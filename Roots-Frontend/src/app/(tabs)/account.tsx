import { colors, globalStyles } from '@/styles/global';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { currentUser, devices, formatLastSeen } from '@/data/account';
import { useNow } from '@/hooks/useNow';

export default function AccountScreen() {
  const now = useNow();
  const memberSince = new Date(currentUser.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Placeholder until the pairing flow exists (BLE / SoftAP provisioning → POST /plants).
  const addDevice = () => {
    console.log('Pressed: Add Device');
    Alert.alert('Coming soon', 'Device pairing is not available yet.');
  };

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={styles.content}>
      <Text style={globalStyles.title}>Account</Text>

      <View style={[styles.card, styles.profile]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{currentUser.display_name[0].toUpperCase()}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{currentUser.display_name}</Text>
          <Text style={styles.subtle}>{currentUser.email}</Text>
          <Text style={styles.subtle}>Member since {memberSince}</Text>
        </View>
      </View>

      <Text style={globalStyles.sectionTitle}>Current Devices</Text>
      {devices.length === 0 ? (
        <Text style={globalStyles.empty}>No devices paired yet.</Text>
      ) : (
        <View style={styles.card}>
          {devices.map((device, i) => {
            const online = device.status === 'online';
            return (
              <View key={device.device_id} style={[styles.deviceRow, i > 0 && styles.divider]}>
                <Ionicons name='hardware-chip-outline' size={24} color={colors.text} />
                <View style={styles.deviceText}>
                  <Text style={styles.deviceName}>{device.plant_name}</Text>
                  <Text style={styles.subtle}>{device.device_id}</Text>
                </View>
                <View style={styles.statusCol}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: online ? colors.text : colors.textSecondary },
                      ]}
                    />
                    <Text style={[styles.statusText, !online && { color: colors.textSecondary }]}>
                      {online ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                  {!online && (
                    <Text style={styles.subtle}>{formatLastSeen(device.last_seen, now)}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={addDevice}
        accessibilityRole='button'
        accessibilityLabel='Add device'
      >
        <Ionicons name='add' size={20} color='#ffffff' />
        <Text style={styles.buttonText}>Add Device</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileText: {
    marginLeft: 14,
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.header,
  },
  subtle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.textSecondary,
  },
  deviceText: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    color: colors.header,
    fontWeight: '600',
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.text,
    borderRadius: 5,
    paddingVertical: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});
