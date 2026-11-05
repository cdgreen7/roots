import { StyleSheet, Text, View, ImageBackground } from 'react-native';
import { Link } from 'expo-router';
import { globalStyles } from '@/styles/global';

const plantimage = require('../../assets/images/login_leaves.png');

export default function WelcomeScreen() {
  return (
    <ImageBackground
      source={plantimage}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Text style={globalStyles.title}>Welcome to Roots!</Text>

        <Link href="/(tabs)">
          Log in
        </Link>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});