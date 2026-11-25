import { useState, useEffect } from 'react';
import { apiRequest } from '@/api/client';
import { globalStyles } from '@/styles/global';
import {StyleSheet, Text, View, ImageBackground, ScrollView, FlatList, Pressable,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../context';
import { cToF, show } from '../../utils/units';
import { PlantReadings, getRecentReadings } from '../../api/readings';


const plantimage = require('../../../assets/images/plant.png');
type PastData = {
    id: string;
    date: string;
    temperature: number | null; 
    humidity: number | null;    
    sunlight: number;          
    moisture: number | null;   
    count: number;              
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

    // load the last 5 days for the selected plant: one 24-hour window per card, all requested at once
    const loadPastData = async (plantId: string) => {
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const now = Date.now();
            const DAY_MS = 24 * 60 * 60 * 1000;
            const days = await Promise.all([1, 2, 3, 4, 5].map(async (day): Promise<PastData> => {
                // limit=1: only ranges and sunlight_hours are used, and they cover the whole window anyway
                const response = await apiRequest<PlantReadings>('/plant_readings', {
                    query: {
                        plant_id: plantId,
                        since: new Date(now - day * DAY_MS).toISOString(),
                        until: new Date(now - (day - 1) * DAY_MS).toISOString(),
                        limit: 1,
                    },
                });
                const { ranges } = response;
                return {
                    id: String(day),
                    date: day === 1 ? 'Last 24 hours' : `${day} days ago`,
                    temperature: cToF(ranges.temp.avg),
                    humidity: ranges.humidity.avg,
                    sunlight: response.sunlight_hours,
                    moisture: ranges.soil_moisture.avg,
                    count: ranges.count,
                };
            }));
            setPastData(days);
        } catch (err) {
            setPastData([]);
            setHistoryError(err instanceof Error ? err.message : 'Unable to load historical readings.');
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

    
    // current day's readings for selected plant (last 24 hrs)
    const [day, setDay] = useState<PlantReadings | null>(null);
    useEffect(() => {
        if (selectedPlant === null) return;
        let cancelled = false; // ignore a slow answer for a plant that's no longer selected
        getRecentReadings(selectedPlant, 24)
            .then(data => { if (!cancelled) setDay(data); })
            .catch(() => { if (!cancelled) setDay(null); });
        return () => { cancelled = true; };
    }, [selectedPlant]);

    // newest reading, uses unit functions from utils/units.ts to convert and format readings for display
    const current = day?.current;
    const currentData = {
        temperature: show(cToF(current?.temp)),
        humidity: show(current?.humidity),
        sunlight: show(day?.sunlight_hours),
        moisture: show(current?.soil_moisture),
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

                    {item.count === 0 ? (
                        <Text style={styles.historyCardSubText}>No data</Text>
                    ) : (
                        <>
                            <Text style={styles.historyCardSubText}>
                                Temperature: {show(item.temperature)}°F
                            </Text>

                            <Text style={styles.historyCardSubText}>
                                Humidity: {show(item.humidity)}%
                            </Text>

                            <Text style={styles.historyCardSubText}>
                                Sunlight: {show(item.sunlight)} hrs
                            </Text>

                            <Text style={styles.historyCardSubText}>
                                Moisture: {show(item.moisture)}%
                            </Text>
                        </>
                    )}
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