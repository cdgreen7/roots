import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { globalStyles } from '@/styles/global';
import { getCurrentUser } from '../../api/session';

/*
  ProfileScreen shows the logged-in account and the plants linked to it.
*/
export default function ProfileScreen() {
  const user = getCurrentUser();

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
});