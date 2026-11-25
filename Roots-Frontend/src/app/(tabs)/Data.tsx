import { useState, useEffect } from 'react';
import { apiRequest } from '@/api/client';
import { globalStyles } from '@/styles/global';
import {StyleSheet, Text, View, ImageBackground, ScrollView, FlatList, Pressable,} from 'react-native';
import plantimage from '../../../assets/images/plant.png';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../context';

type SensorRange = {
    min: number;
    max: number;
    avg: number;
};

type PlantReadingResponse = {
    ranges: {
        temperature?: SensorRange;
        humidity?: SensorRange;
        sunlight?: SensorRange;
        moisture?: SensorRange;
    };
};

type PastData = {
    id: string;
    date: string;
    temperature: number;
    humidity: number;
    sunlight: number;
    moisture: number;
};

export default function DataDashboard() {
    //define variables for easy integration with sensor data
    const { plants, loading, error, loadPlants } = usePlants();

    const [selectedPlant, setSelectedPlant] = useState<string | null>(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);

    // Historical readings
    const [pastData, setPastData] = useState<PastData[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    //load plants from backend
    useEffect(() => {
        loadPlants();
    }, [loadPlants]);

    //select the first plant after the API returns data
    useEffect(() => {
        if (plants.length > 0 && selectedPlant === null) {
            setSelectedPlant(plants[0].id);
        }
    }, [plants, selectedPlant]);

    // load historical readings for selected plant
    const loadPastData = async (plantId: string) => {
        try {
            setHistoryLoading(true);
            setHistoryError(null);
            setPastData([]);

            const results: PastData[] = [];
            const now = new Date();

            console.log('Loading historical data for plant:', plantId);

            for (let day = 1; day <= 5; day++) {

                const until = new Date(now);
                until.setDate(now.getDate() - (day - 1));

                const since = new Date(now);
                since.setDate(now.getDate() - day);

                const params = new URLSearchParams({
                    plant_id: plantId,
                    since: since.toISOString(),
                    until: until.toISOString(),
                    limit: '1',
                });

                console.log('Request:', `/plant_readings?${params}`);

                const response =
                    await apiRequest<PlantReadingResponse>(
                        `/plant_readings?${params.toString()}`
                    );

                // Debug API response
                console.log(`Day ${day} response:`, response);

                const newData: PastData = {
                    id: String(day),
                    date: day === 1 ? 'Yesterday' : `${day} days ago`,

                    temperature: response?.ranges?.temperature?.avg ?? 0,
                    humidity: response?.ranges?.humidity?.avg ?? 0,
                    sunlight: response?.ranges?.sunlight?.avg ?? 0,
                    moisture: response?.ranges?.moisture?.avg ?? 0,
                };

                results.push(newData);

                // Update cards as each request completes
                setPastData([...results]);
            }

        } catch (err) {
            console.error('Error loading past readings:', err);
            setHistoryError('Unable to load historical readings. Check console.');
        } finally {
            setHistoryLoading(false);
        }
    };

    // reload historical data whenever selected plant changes
    useEffect(() => {
        if (selectedPlant !== null) {
            loadPastData(selectedPlant);
        }
    }, [selectedPlant]);

    // currently selected plant
    const currentPlant = plants.find(
        plant => plant.id === selectedPlant
    );

    

    // current plant sensor data
    const currentData = {
        temperature: currentPlant?.temperature ?? 0,
        humidity: 0,
        sunlight: 0,
        moisture: currentPlant?.moisture ?? 0,
    };


    if (loading) {
    return (
        <View>
            <Text>Loading plants...</Text>
        </View>
    );
}

    if (error) {
        return (
            <View>
                <Text>Error loading plants: {error}</Text>
            </View>
        );
    }

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
                    color='#68512e'
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
                                        color='#68512e'
                                    />
                                )}
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}
        </View>


        <View style={styles.centerWrapper}>
            <ImageBackground
                source={plantimage}
                style={styles.backgroundImage}
                imageStyle={{ resizeMode: 'contain' }}
            >
                <View style={styles.imageOverlay} />

                <View style={styles.temperatureLabelBox}>
                    <Text style={styles.temperatureLabelText}>
                        Temperature: {currentData.temperature} °F
                        {'\n\n\n'}
                        Humidity: {currentData.humidity}%
                        {'\n\n\n'}
                        Daily Sunlight: {currentData.sunlight} hrs
                        {'\n\n\n'}
                        Soil Moisture: {currentData.moisture}%
                    </Text>
                </View>
            </ImageBackground>
        </View>


        <Text style={globalStyles.sectionTitle}>Past Average Data</Text>
        {!historyLoading && !historyError && pastData.length === 0 && (
            <Text>No historical data available.</Text>
        )}
        {historyLoading && (
            <Text>Loading historical data...</Text>
        )}

        {historyError && (
            <Text>{historyError}</Text>
        )}
        <FlatList
            data={pastData}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={styles.historyCard}>
                    <Text style={styles.historyCardTitle}>
                        {item.date}
                    </Text>

                    <Text style={styles.historyCardSubText}>
                        Temperature: {item.temperature.toFixed(1)}°F
                    </Text>

                    <Text style={styles.historyCardSubText}>
                        Humidity: {item.humidity.toFixed(1)}%
                    </Text>

                    <Text style={styles.historyCardSubText}>
                        Sunlight: {item.sunlight.toFixed(1)} hrs
                    </Text>

                    <Text style={styles.historyCardSubText}>
                        Moisture: {item.moisture.toFixed(1)}%
                    </Text>
                </View>
            )}
        />
    </ScrollView>
    );
}

/*page background */
const styles = StyleSheet.create({
    centerWrapper: { //Ensures background image is centered on the page
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
        ...StyleSheet.absoluteFill,
        //Same color as global background, 4th number determines opacity level (higher more opaque)
        backgroundColor: 'rgba(230, 231, 226, 0.67)', 
    },
    temperatureLabelBox: {
        position: 'absolute',
        top: 50,
        justifyContent: 'center', 
    },
    temperatureLabelText:{
        fontSize: 35,
        fontWeight: '600',
        color: '#242444',
        textAlign: 'center',
    },
    historyCard: {
        width: 300, 
        height: 240, 
        backgroundColor: '#18491498', 
        marginRight: 10, 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center'
    },
    historyCardTitle: { 
        color: '#fff', 
        fontSize: 18,
        fontWeight: 'bold'
    },
    historyCardSubText: {
        color: '#e0e0e0',
        fontSize: 18,
        marginTop: 8
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
        backgroundColor: '#e4d8ce',
        padding: 16,
        borderRadius: 12,
    },

    dropdownText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#68512e',
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
        fontSize: 18,
        color: '#333333',
    },
});