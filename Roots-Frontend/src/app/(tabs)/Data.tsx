import { globalStyles } from '@/styles/global';
import { StyleSheet, Text, View, ImageBackground, ScrollView, FlatList } from 'react-native';
import plantimage from '../../../assets/images/plant.png'

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
                {/*placeholder data until data from sensors can be integrated*/}
                <Text style={styles.temperatureLabelText}>Temperature: 60 °F{"\n"}{"\n"}{"\n"}
                    Humidity: 40%{"\n"}{"\n"}{"\n"}Daily Sunlight: 8 hrs {"\n"}{"\n"}{"\n"}
                    Soil Moisture: 45%</Text> 
            </View>    
        </View>


        <Text style={globalStyles.sectionTitle}>Past Average Data</Text>
        {/*----------will need to replace with actual past data (avered per day, so past 5 days)*/}
        <FlatList
            data={[{id: 2, title: 'Past data 1'}, {id: 3, title: 'Past data 2'}, {id: 4, title: 'Past data 3'}, {id: 5, title: 'Past data 4'}, {id: 6, title: 'Past data 5'}]}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
                <View style={{ width: 300, height: 200, backgroundColor: '#18491498', marginRight: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 18 }}>{item.title}</Text>
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
});

