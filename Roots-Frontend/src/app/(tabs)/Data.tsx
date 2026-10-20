import { colors, globalStyles } from '@/styles/global';
import { StyleSheet, Text, View, ImageBackground, ScrollView, FlatList } from 'react-native';
import plantimage from '../../../assets/images/plant.png'
import { currentReading, metrics, metricStatus, pastAverages, plantRules } from '@/data/plant';

export default function DataDashboard() {

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
                {/*mock data from src/data/plant.ts until sensor data is served by the backend*/}
                {metrics.map((m) => (
                    <Text
                        key={m.key}
                        style={[
                            styles.temperatureLabelText,
                            metricStatus(m.key, currentReading[m.key], plantRules) !== 'ok' && { color: colors.alert },
                        ]}
                    >
                        {m.label}: {currentReading[m.key]}{m.unit}
                    </Text>
                ))}
            </View>
        </View>


        <Text style={globalStyles.sectionTitle}>Past Average Data</Text>
        {/*daily averages for the past 5 days, most recent first*/}
        <FlatList
            data={pastAverages}
            keyExtractor={(item) => item.recorded_at}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pastList}
            renderItem={({ item }) => (
                <View style={styles.pastCard}>
                    <Text style={styles.pastDate}>
                        {new Date(item.recorded_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                    {metrics.map((m) => (
                        <View key={m.key} style={styles.pastRow}>
                            <Text style={styles.pastText}>{m.label}</Text>
                            <Text style={styles.pastText}>{item[m.key]}{m.unit}</Text>
                        </View>
                    ))}
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
        gap: 60,
    },
    temperatureLabelText:{
        fontSize: 35,
        fontWeight: '600',
        color: '#242444',
        textAlign: 'center',
    },
    pastList: {
        marginBottom: 40,
    },
    pastCard: {
        width: 300,
        height: 200,
        backgroundColor: '#18491498',
        marginRight: 10,
        borderRadius: 10,
        padding: 16,
        justifyContent: 'center',
    },
    pastDate: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    pastRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    pastText: {
        color: '#fff',
        fontSize: 16,
    },
});

