import { globalStyles } from '@/styles/global';
import { StyleSheet, Text, View, Image, ImageBackground } from 'react-native';
import plantimage from '../../../assets/images/plant.png'

export default function DataDashboard() {

    return (
    <View style={globalStyles.container}>
        <Text style={globalStyles.title}>Plant Data</Text>
        <View style={styles.centerWrapper}>
            {/*plant back ground image to allow for data to be displayed around image*/}
            <ImageBackground 
                source={plantimage} 
                style={styles.backgroundImage} 
            />
            <View style={styles.temperatureLabelBox}>
                {/*60 is placeholder temp until data from sensors can be integrated*/}
                <Text style={styles.temperatureLabelText}>60 °F{"\n"}40%</Text> 
            </View>   
            <View style={styles.sunlightLabelBox}>
                {/*8 hrs is placeholder temp until data from sensors can be integrated*/}
                <Text style={styles.sunlightLabelText}>Daily Sunlight:{"\n"}8 hrs</Text> 
            </View>  
            <View style={styles.soilLabelBox}>
                {/* is placeholder temp until data from sensors can be integrated*/}
                <Text style={styles.sunlightLabelText}>Soil Moisture: 45%</Text> 
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
    temperatureLabelBox: {
        position: 'absolute',
        top: 50,
        left: 10,

    },
    temperatureLabelText:{
        fontSize: 25,
        fontWeight: '600',
        color: '#242444',
    },
    sunlightLabelBox:{
        position: 'absolute',
        top: 50,
        right: 10, 
    },
    sunlightLabelText:{
        fontSize: 25,
        fontWeight: '600',
        color: '#242444',
        textAlign: 'center',
    },
    soilLabelBox: {
        position: 'absolute',
        bottom: 15,
        justifyContent: 'center', 

    },
});