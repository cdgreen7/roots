import { globalStyles } from '@/styles/global';
import { Text, View } from 'react-native';
import { Calendar} from "react-native-calendar-ui";

export default function ScheduleScreen() {

    return (
    <View style={globalStyles.container}>
        <Text style={globalStyles.title}>Schedule</Text>


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
