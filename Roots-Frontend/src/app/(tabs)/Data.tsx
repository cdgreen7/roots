
import { useState } from 'react';
import { globalStyles } from '@/styles/global';
import {StyleSheet, Text, View, ImageBackground, ScrollView, FlatList, Pressable,} from 'react-native';
import plantimage from '../../../assets/images/plant.png';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../context';

export default function DataDashboard() {
    // Get the shared plants array from Context
    const { plants } = usePlants();

    const [selectedPlant, setSelectedPlant] = useState(
        plants[0]?.id ?? null
    );

    const [dropdownVisible, setDropdownVisible] = useState(false);

    // Find the currently selected plant
    const currentPlant = plants.find(
        plant => plant.id === selectedPlant
    );

    // Placeholder sensor data
    const [currentData] = useState({
        temperature: 60,
        humidity: 40,
        sunlight: 8,
        soilMoisture: 45,
    });

    // Placeholder historical data
    const [pastData] = useState([
        { id: '1', title: 'Day 1 Average', temp: 62, humidity: 41, totalSunlight: 8, soilMoisture: 45 },
        { id: '2', title: 'Day 2 Average', temp: 59, humidity: 39, totalSunlight: 7, soilMoisture: 40 },
        { id: '3', title: 'Day 3 Average', temp: 60, humidity: 40, totalSunlight: 9, soilMoisture: 42 },
        { id: '4', title: 'Day 4 Average', temp: 61, humidity: 44, totalSunlight: 8, soilMoisture: 44 },
        { id: '5', title: 'Day 5 Average', temp: 60, humidity: 45, totalSunlight: 7, soilMoisture: 43 },
    ]);

    return (
        <ScrollView style={globalStyles.container}>
            <Text style={globalStyles.title}>Plant Data</Text>

            {/* Plant dropdown */}
            <View style={styles.dropdownContainer}>
                <Pressable
                    style={styles.dropdownButton}
                    onPress={() => setDropdownVisible(!dropdownVisible)}
                >
                    <Text style={styles.dropdownText}>
                        {currentPlant?.name ?? 'Select a Plant'}
                    </Text>

                    <Ionicons
                        name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color="#338a36"
                    />
                </Pressable>

                {dropdownVisible && (
                    <View style={styles.dropdownOptions}>
                        {plants.map(plant => (
                            <Pressable
                                key={plant.id}
                                style={styles.dropdownItem}
                                onPress={() => {
                                    setSelectedPlant(plant.id);
                                    setDropdownVisible(false);
                                }}
                            >
                                <View style={styles.dropdownItemContent}>
                                    <Text style={styles.dropdownItemText}>
                                        {plant.name}
                                    </Text>

                                    {selectedPlant === plant.id && (
                                        <Ionicons
                                            name="checkmark"
                                            size={20}
                                            color="#338a36"
                                        />
                                    )}
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
            </View>

            {/* Plant sensor data */}
            <View style={styles.centerWrapper}>
                <ImageBackground
                    source={plantimage}
                    style={styles.backgroundImage}
                    imageStyle={{ borderRadius: 12 }}
                />

                <View style={styles.imageOverlay} />

                <View style={styles.temperatureLabelBox}>
                    <Text style={styles.temperatureLabelText}>
                        Temperature: {currentData.temperature} °F

                        {'\n\n\n'}

                        Humidity: {currentData.humidity}%

                        {'\n\n\n'}

                        Daily Sunlight: {currentData.sunlight} hrs

                        {'\n\n\n'}

                        Soil Moisture: {currentData.soilMoisture}%
                    </Text>
                </View>
            </View>

            {/* Past average data */}
            <Text style={globalStyles.sectionTitle}>
                Past Average Data
            </Text>

            <FlatList
                data={pastData}
                horizontal
                showsHorizontalScrollIndicator
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.historyCard}>
                        <Text style={styles.historyCardTitle}>
                            {item.title}
                        </Text>

                        <Text style={styles.historyCardSubText}>
                            {item.temp}°F | {item.humidity}% | {item.totalSunlight} hrs | {item.soilMoisture}%
                        </Text>
                    </View>
                )}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centerWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },

    backgroundImage: {
        height: 570,
        width: 360,
        resizeMode: 'center',
    },

    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(230, 231, 226, 0.67)',
    },

    temperatureLabelBox: {
        position: 'absolute',
        top: 50,
        justifyContent: 'center',
    },

    temperatureLabelText: {
        fontSize: 35,
        fontWeight: '600',
        color: '#242444',
        textAlign: 'center',
    },

    historyCard: {
        width: 300,
        height: 200,
        backgroundColor: '#18491498',
        marginRight: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },

    historyCardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },

    historyCardSubText: {
        color: '#e0e0e0',
        fontSize: 18,
        marginTop: 8,
    },

    dropdownContainer: {
        marginVertical: 12,
        marginHorizontal: 10,
        zIndex: 10,
    },

    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 16,
        borderRadius: 12,
    },

    dropdownText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#338a36',
    },

    dropdownOptions: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginTop: 5,
        elevation: 4,
    },

    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },

    dropdownItemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    dropdownItemText: {
        fontSize: 16,
        color: '#333333',
    },
});
