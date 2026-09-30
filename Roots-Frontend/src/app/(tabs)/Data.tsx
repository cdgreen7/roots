import { globalStyles } from '@/styles/global';
import { StyleSheet, Text, View, ImageBackground } from 'react-native';
import plantimage from '../../../assets/images/plant.png'

export default function DataDashboard() {

    return (
    <View style={globalStyles.container}>
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
    </View>
    );
}

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