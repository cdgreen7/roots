import { useState, useEffect } from 'react';
import { globalStyles } from '@/styles/global';
import {StyleSheet, Text, View, ImageBackground, ScrollView, FlatList, Pressable,} from 'react-native';
import plantimage from '../../../assets/images/plant.png';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../context';

export default function DataDashboard() {
    //define variables for easy integration with sensor data
    const { plants, loading, error, loadPlants } = usePlants();

    const [selectedPlant, setSelectedPlant] = useState<number | null>(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);


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

    // currently selected plant
    const currentPlant = plants.find(
        plant => plant.id === selectedPlant
    );

    // historical data (temp)
    const currentData = {
        temperature: currentPlant?.temperature ?? 0,
        humidity: 0,
        sunlight: 0,
        moisture: currentPlant?.moisture ?? 0,
    };

    const pastData = [
        { id: '1', date: 'Yesterday', temperature: 22 },
        { id: '2', date: '2 days ago', temperature: 21 },
    ];


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
        {/*----------will need to replace with actual past data (avered per day, so past 5 days)*/}
        <FlatList
            data={pastData}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View style={styles.historyCard}>
                    <Text style={styles.historyCardTitle}>{item.date}</Text>
                    <Text style={styles.historyCardSubText}>
                        {item.temperature}°F
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
        height: 200, 
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