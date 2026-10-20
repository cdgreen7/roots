import { colors, globalStyles } from '@/styles/global';
import { Text, TextInput, TouchableOpacity, View, ScrollView, Alert, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Calendar } from 'react-native-calendar-ui';
import { Ionicons } from '@expo/vector-icons';
import { formatSchedule, parseTime, useSchedules } from '@/state/schedule';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [wateringTime, setWateringTime] = useState('');
  const { schedules, addSchedule, removeSchedule } = useSchedules();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scheduleWatering = () => {
    console.log('Pressed: Schedule Watering', wateringTime);
    if (!selectedDate) {
      Alert.alert('Please select a date.');
      return;
    }

    const time = parseTime(wateringTime);
    if (!time) {
      Alert.alert('Invalid time', 'Enter a time like 8:00 AM or 14:30.');
      return;
    }

    // Combine the selected day with the entered time
    const at = new Date(selectedDate);
    at.setHours(time[0], time[1], 0, 0);

    if (at.getTime() < Date.now()) {
      Alert.alert('That time has already passed.');
      return;
    }

    console.log('Scheduled:', at);
    addSchedule(at);
    Alert.alert('Watering Scheduled', `Watering scheduled for ${formatSchedule(at)}`);
    setWateringTime('');
  };

  const confirmRemove = (id: string, label: string) => {
    console.log('Pressed: Remove', label);
    Alert.alert('Remove watering?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        console.log('Removed:', label);
        removeSchedule(id);
      } },
    ]);
  };

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={styles.content}>
      <Text style={globalStyles.title}>Watering Schedule</Text>

      <Calendar
        onDateSelect={(date) => {
          console.log('Selected:', date);
          setSelectedDate(date);
        }}
        minDate={today}
        markedDates={schedules.map((s) => s.at.getTime())}
        colors={{
          primary: '#4b6888',
          selectedText: '#ffffff',
        }}
      />

      {selectedDate && (
        <View style={styles.form}>
          <Text style={styles.selected}>Selected Date: {selectedDate.toLocaleDateString()}</Text>

          <TextInput
            placeholder='Watering time (ex: 8:00 AM)'
            placeholderTextColor={colors.textSecondary}
            value={wateringTime}
            onChangeText={setWateringTime}
            onSubmitEditing={scheduleWatering}
            returnKeyType='done'
            style={styles.input}
          />

          <TouchableOpacity style={styles.button} onPress={scheduleWatering}>
            <Text style={styles.buttonText}>Schedule Watering</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.heading}>Upcoming Watering</Text>

      {schedules.length === 0 ? (
        <Text style={globalStyles.empty}>No watering scheduled.</Text>
      ) : (
        schedules.map((schedule) => {
          const label = formatSchedule(schedule.at);
          return (
            <View key={schedule.id} style={styles.item}>
              <Text style={styles.itemText}>🌱 {label}</Text>
              <TouchableOpacity
                onPress={() => confirmRemove(schedule.id, label)}
                hitSlop={10}
                accessibilityLabel={`Remove watering on ${label}`}
              >
                <Ionicons name='trash-outline' size={20} color={colors.alert} />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  form: {
    marginTop: 20,
  },
  selected: {
    color: colors.header,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.textSecondary,
    backgroundColor: '#ffffff',
    color: colors.header,
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: colors.text,
    borderRadius: 5,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  heading: {
    fontWeight: 'bold',
    fontSize: 18,
    color: colors.header,
    marginTop: 25,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemText: {
    color: colors.header,
    fontSize: 15,
  },
});
