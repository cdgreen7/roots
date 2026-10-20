import { useState } from 'react';
import { globalStyles } from '@/styles/global';
import { StyleSheet, Text, View, ImageBackground, ScrollView, FlatList } from 'react-native';
import plantimage from '../../../assets/images/plant.png'

export default function DataDashboard() {
    //define variables for easy integration with sensor data
    const [currentData, setCurrentData] = useState({
        temperature: 60,
        humidity: 40,
        sunlight: 8,
        soilMoisture: 45
    });
    const [pastData, setPastData] = useState([
        { id: '1', title: 'Day 1 Average', temp: 62, humidity: 41, totalSunlight: 8, soilMoisture: 45 },
        { id: '2', title: 'Day 2 Average', temp: 59, humidity: 39, totalSunlight: 7, soilMoisture: 40 },
        { id: '3', title: 'Day 3 Average', temp: 60, humidity: 40, totalSunlight: 9, soilMoisture: 42 },
        { id: '4', title: 'Day 4 Average', temp: 61, humidity: 44, totalSunlight: 8, soilMoisture: 44 },
        { id: '5', title: 'Day 5 Average', temp: 60, humidity: 45, totalSunlight: 7, soilMoisture: 43 },
    ]);
    return (
    <ScrollView style={globalStyles.container}>
        <Text style={globalStyles.title}>Plant Data</Text>
        <View style={styles.centerWrapper}>
            {/*plant back ground image to allow for data to be displayed on image*/}
            <ImageBackground 
                source={plantimage} 
                style={styles.backgroundImage} 
            />
            {/*Semi transparent layer over image*/}
            <View style={styles.imageOverlay} />
            <View style={styles.temperatureLabelBox}>
                {/*placeholder data until data from sensors can be integrated*/}
                <Text style={styles.temperatureLabelText}>Temperature: {currentData.temperature} °F{"\n"}{"\n"}{"\n"}
                    Humidity: {currentData.humidity}%{"\n"}{"\n"}{"\n"}Daily Sunlight: {currentData.sunlight} hrs {"\n"}{"\n"}{"\n"}
                    Soil Moisture: {currentData.soilMoisture}%</Text> 
            </View>    
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
                    <Text style={styles.historyCardTitle}>{item.title}</Text>
                    <Text style={styles.historyCardSubText}>{item.temp}°F | {item.humidity}% | {item.totalSunlight} hrs | {item.soilMoisture}%</Text>
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
    }
});

