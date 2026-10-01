import { colors, globalStyles } from '@/styles/global';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { Calendar} from "react-native-calendar-ui";

export default function ScheduleScreen() {
// -----todo: take input to schedule watering dates for the plant
    return (
    <View style={globalStyles.container}>
        <Text style={globalStyles.title}>Watering Schedule</Text>


        {/*added calendar component just for visual (replace with view to insert water dates)*/}
        <Calendar
        onDateSelect={(date) => console.log("Selected:", date)}
        colors={{
        primary: "#4b6888",
        selectedText: "#ffffffa8",
        }}
        />
    </View>

    );
}
