import { colors, globalStyles } from '@/styles/global';
import { Text, TextInput, TouchableOpacity, View, ScrollView, Alert, Button } from 'react-native';
import { useState } from 'react';
import { Calendar} from "react-native-calendar-ui";

type WateringSchedule = {
  date: string;
  time: string;
};

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [wateringTime, setWateringTime] = useState('');
  const [schedules, setSchedules] = useState<WateringSchedule[]>([]);

  const scheduleWatering = () => {
    if (!selectedDate) {
      Alert.alert('Please select a date.');
      return;
    }

    if (!wateringTime) {
      Alert.alert('Please enter a watering time.');
      return;
    }

    // Convert Date object into a readable string
    const formattedDate = selectedDate.toLocaleDateString();

    const newSchedule: WateringSchedule = {
      date: formattedDate,
      time: wateringTime,
    };

    setSchedules((currentSchedules) => [
      ...currentSchedules,
      newSchedule,
    ]);

    Alert.alert(
      'Watering Scheduled',
      `Watering scheduled for ${formattedDate} at ${wateringTime}`
    );

    setWateringTime('');
  };

  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>
        Watering Schedule
      </Text>

      <Calendar
        onDateSelect={(date) => {
          console.log('Selected:', date);
          setSelectedDate(date);
        }}
        colors={{
          primary: '#4b6888',
          selectedText: '#ffffff',
        }}
      />

      {selectedDate && (
        <View style={{ marginTop: 20 }}>
          <Text>
            Selected Date: {selectedDate.toLocaleDateString()}
          </Text>

          <TextInput
            placeholder="Watering time (ex: 8:00 AM)"
            value={wateringTime}
            onChangeText={setWateringTime}
            style={{
              borderWidth: 1,
              padding: 10,
              marginTop: 10,
              marginBottom: 10,
              borderRadius: 5,
            }}
          />

          <Button
            title="Schedule Watering"
            onPress={scheduleWatering}
          />
        </View>
      )}

      <View style={{ marginTop: 25 }}>
        <Text
          style={{
            fontWeight: 'bold',
            fontSize: 18,
          }}
        >
          Upcoming Watering
        </Text>

        {schedules.length === 0 ? (
          <Text style={{ marginTop: 10 }}>
            No watering scheduled.
          </Text>
        ) : (
          schedules.map((schedule, index) => (
            <Text
              key={index}
              style={{ marginTop: 8 }}
            >
              🌱 {schedule.date} — {schedule.time}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
}