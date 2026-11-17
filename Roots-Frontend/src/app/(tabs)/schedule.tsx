import { colors, globalStyles } from '@/styles/global';
import { Text, TextInput, TouchableOpacity, View, ScrollView, Alert, Button, Platform } from 'react-native';
import { useState, useMemo } from 'react';
import { Calendar } from "react-native-calendar-ui";
import DateTimePicker from "@react-native-community/datetimepicker";

type Frequency = "Never" | "Twice a Day" | "Daily" | "Weekly";

type RecurringRule = {
  id: string;
  startDate: string; 
  baseDateObject: Date; 
  plantName: string;
  timeString: string;
  frequency: Frequency;
  endDate?: string;
};

type ProjectedDisplayItem = {
  ruleId: string;
  plantName: string;
  dateDisplay: string;
  dateKey: string;
  timeDisplay: string;
  frequency: Frequency;
  sortTimestamp: number;
};

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [wateringTime, setWateringTime] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("Never");
  const [plantName, setPlantName] = useState("");
  const [rules, setRules] = useState<RecurringRule[]>([]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleCancelWatering = (ruleId: string, itemFrequency: Frequency, itemDateKey: string) => {
    if (itemFrequency === "Never") {
      // Single event: complete removal
      setRules((currentRules) => currentRules.filter((rule) => rule.id !== ruleId));
    } else {
      // Recurring series: stop this one and all following instances
      setRules((currentRules) =>
        currentRules.map((rule) => {
          if (rule.id === ruleId) {
            const [year, month, day] = itemDateKey.split("-").map(Number);
            const selectedInstanceDate = new Date(year, month - 1, day);
            const dayBefore = new Date(selectedInstanceDate);
            dayBefore.setDate(dayBefore.getDate() - 1);

            return {
              ...rule,
              endDate: formatDateKey(dayBefore),
            };
          }
          return rule;
        })
      );
      Alert.alert("Schedule Stopped", "Future iterations of this schedule have been stopped.");
    }
  };


  const scheduleWatering = () => {
    if (!selectedDate) {
      Alert.alert('Please select a date.');
      return;
    }

    const today = new Date();
    const formattedDate = selectedDate.toLocaleDateString();
    const formattedToday = today.toLocaleDateString();

    if (formattedDate === formattedToday) {
      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      const selectedMinutes = wateringTime.getHours() * 60 + wateringTime.getMinutes();

      if (selectedMinutes <= currentMinutes) {
        Alert.alert('Invalid Time', 'Please select a watering time that is after the current time.');
        return;
      }
    }

    const baseInstance = new Date(selectedDate);
    baseInstance.setHours(wateringTime.getHours());
    baseInstance.setMinutes(wateringTime.getMinutes());
    baseInstance.setSeconds(0);

    const newRule: RecurringRule = {
      id: Math.random().toString(36).substring(2, 9),
      startDate: selectedDate.toLocaleDateString(),
      baseDateObject: baseInstance,
      plantName: plantName.trim(),
      timeString: formatTime(wateringTime),
      frequency: frequency,
    };

    setRules((currentRules) => [...currentRules, newRule]);
    if (frequency !== "Never") {
      Alert.alert(`Watering scheduled for ${formattedDate} at ${formatTime(wateringTime)} with frequency: ${frequency}`);
    } else {
      Alert.alert(`Watering scheduled for ${formattedDate} at ${formatTime(wateringTime)}`);
    }
    setFrequency("Never");
    setPlantName("");
  };

const getProjectedSchedules = (): ProjectedDisplayItem[] => {
  const projections: ProjectedDisplayItem[] = [];
  //Set up reoccuring watering based on freqeuncy input
  rules.forEach((rule) => {
    const base = rule.baseDateObject instanceof Date 
      ? rule.baseDateObject 
      : new Date(rule.baseDateObject);
    
    const isPastEndDate = (target: Date) => {
      return rule.endDate !== undefined && formatDateKey(target) > rule.endDate;
    };

    if (rule.frequency === "Never") {
      projections.push({
        ruleId: rule.id,
        plantName: rule.plantName,
        dateDisplay: rule.startDate,
        dateKey: formatDateKey(base),
        timeDisplay: rule.timeString,
        frequency: "Never",
        sortTimestamp: base.getTime(),
      });
    } 
    //Populate twice a day for 7 days, updates every time app is loaded to not overwhelm UI
    //Ex. Starting 10/10 populates through 10/17. Opening the app on 10/18 populates through 10/11 etc...
    else if (rule.frequency === "Twice a Day") {
      let dayOffset = 0;
      let targetDay = new Date(base);
      
      const maxWindow = new Date();
      maxWindow.setDate(maxWindow.getDate() + 7);

      while (targetDay <= maxWindow) {
        if (!isPastEndDate(targetDay)) {
          projections.push({
            ruleId: rule.id,
            plantName: rule.plantName,
            dateDisplay: targetDay.toLocaleDateString(),
            dateKey: formatDateKey(targetDay),
            timeDisplay: formatTime(targetDay),
            frequency: "Twice a Day",
            sortTimestamp: targetDay.getTime(),
          });
        }

        const secondSlot = new Date(targetDay);
        secondSlot.setHours(secondSlot.getHours() + 12);
        if (!isPastEndDate(secondSlot)) {
          projections.push({
            ruleId: rule.id,
            plantName: rule.plantName,
            dateDisplay: secondSlot.toLocaleDateString(),
            dateKey: formatDateKey(secondSlot),
            timeDisplay: formatTime(secondSlot),
            frequency: "Twice a Day",
            sortTimestamp: secondSlot.getTime(),
          });
        }
        
        dayOffset++;
        targetDay = new Date(base);
        targetDay.setDate(targetDay.getDate() + dayOffset);
      }
    } 
    //Populates daily 14 days at a time
    else if (rule.frequency === "Daily") {
      let dayOffset = 0;
      let runDate = new Date(base);
      
      const maxWindow = new Date();
      maxWindow.setDate(maxWindow.getDate() + 14);

      while (runDate <= maxWindow) {
        if (!isPastEndDate(runDate)) {
          projections.push({
            ruleId: rule.id,
            plantName: rule.plantName,
            dateDisplay: runDate.toLocaleDateString(),
            dateKey: formatDateKey(runDate),
            timeDisplay: rule.timeString,
            frequency: "Daily",
            sortTimestamp: runDate.getTime(),
          });
        }
        
        dayOffset++;
        runDate = new Date(base);
        runDate.setDate(runDate.getDate() + dayOffset);
      }
    } 
    //Populates weekly 14 weeks at a time
    else if (rule.frequency === "Weekly") {
      let weekOffset = 0;
      let runDate = new Date(base);
      
      const maxWindow = new Date();
      maxWindow.setDate(maxWindow.getDate() + (14 * 7));

      while (runDate <= maxWindow) {
        if (!isPastEndDate(runDate)) {
          projections.push({
            ruleId: rule.id,
            plantName: rule.plantName,
            dateDisplay: runDate.toLocaleDateString(),
            dateKey: formatDateKey(runDate),
            timeDisplay: rule.timeString,
            frequency: "Weekly",
            sortTimestamp: runDate.getTime(),
          });
        }
        
        weekOffset++;
        runDate = new Date(base);
        runDate.setDate(runDate.getDate() + (weekOffset * 7));
      }
    }
  });

  return projections.sort((a, b) => a.sortTimestamp - b.sortTimestamp);
};

  
  // Wrap with useMemo so lists dynamically update when 'rules' state changes
  const { pastSchedules, upcomingSchedules } = useMemo(() => {
  const allSchedules = getProjectedSchedules();
    return {
      pastSchedules: allSchedules.filter(item => item.sortTimestamp < Date.now()),
      upcomingSchedules: allSchedules.filter(item => item.sortTimestamp >= Date.now())
    };
  }, [rules]); // Triggers automatically when rules array updates


  return (
    <ScrollView style={globalStyles.container}>
      <Text style={globalStyles.title}>Watering Schedule</Text>

      <Calendar
        onDateSelect={(date) => setSelectedDate(date)}
        colors={{ primary: '#4b6888', selectedText: '#ffffff' }}
      />
      {/* Optional Plant name to associate with watering event*/}
      <View style={{ marginTop: 5, borderTopWidth: 1, borderColor: '#eee', paddingTop: 20 }}>
        <Text style={{ marginBottom: 5, fontWeight: "bold", fontSize: 16 }}>
          Plant Name (optional)
        </Text>
        <TextInput
          value={plantName}
          onChangeText={setPlantName}
          placeholder="e.g. Basil or living room fern"
          accessibilityLabel="Plant name"
          returnKeyType="done"
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 5,
            padding: 10,
            marginBottom: 15,
            backgroundColor: "#fff",
          }}
        />
        <Text style={{ marginBottom: 5, fontWeight: "bold", fontSize: 16, color: selectedDate ? '#000' : '#888' }}>
          Selected Date: {selectedDate ? selectedDate.toLocaleDateString() : 'Never selected'}
        </Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, height: 40, gap: 15 }}>
          <Text style={{ fontWeight: "bold", fontSize: 16, color: selectedDate ? '#000' : '#888' }}>
            Watering Time:
          </Text>
          {/*Checks if platform is ios, if yes uses ios time picker, if not uses other time picker option*/}
          {Platform.OS === 'ios' ? (
            <View pointerEvents={selectedDate ? 'auto' : 'none'} style={{ opacity: selectedDate ? 1 : 0.5 }}>
              <DateTimePicker
                value={wateringTime}
                mode="time"
                display="compact"
                onValueChange={(event, date) => { if (date) setWateringTime(date); }}
              />
            </View>
          ) : (
            <>
              <TouchableOpacity 
                disabled={!selectedDate}
                onPress={() => setShowPicker(!showPicker)} 
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, backgroundColor: selectedDate ? "#eee" : "#f5f5f5" }}
              >
                <Text style={{ fontSize: 16, color: selectedDate ? '#000' : '#aaa', fontWeight: '500' }}>
                  {formatTime(wateringTime)}
                </Text>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={wateringTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onValueChange={(event, date) => {
                    setShowPicker(false);
                    if (date) setWateringTime(date); 
                  }}
                />
              )}
            </>
          )}
        </View>
        {/* Creates freqeuncy buttons*/}
        <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10, color: selectedDate ? '#000' : '#888' }}>
          Repeat Frequency
        </Text>
        
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 5, gap: 10 }}>
          {(["Never", "Twice a Day", "Daily", "Weekly"] as Frequency[]).map((f) => {
            const isSelected = frequency === f;
            return (
              <TouchableOpacity
                key={f}
                disabled={!selectedDate}
                onPress={() => setFrequency(f)}
                style={{
                  minWidth: "45%",
                  flexGrow: 1,
                  padding: 10,
                  borderWidth: 1,
                  borderRadius: 5,
                  alignItems: "center",
                  borderColor: !selectedDate ? '#eee' : isSelected ? "#4b6888" : "#ccc",
                  backgroundColor: !selectedDate ? '#fcfcfc' : isSelected ? "#4b6888" : "transparent",
                }}
              >
                <Text style={{ color: !selectedDate ? '#aaa' : isSelected ? "#fff" : "#000" }}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="Schedule Watering" onPress={scheduleWatering} disabled={!selectedDate} />
      </View>

      <View style={{ marginTop: 25, marginBottom: 40 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Upcoming Watering</Text>

        {upcomingSchedules.length === 0 ? (
          <Text style={{ marginTop: 10, color: '#666' }}>No watering scheduled.</Text>
        ) : (
          upcomingSchedules.map((schedule, index) => (
            <View 
              key={index} 
              style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginTop: 10,
                borderBottomWidth: 1,
                borderColor: '#f0f0f0',
                paddingBottom: 8
              }}
            >
              <Text style={{ fontSize: 15, flex: 1 }}>
                🌱 {schedule.plantName ? `${schedule.plantName} — ` : ""}{schedule.dateDisplay} — {schedule.timeDisplay}{" "}
                {schedule.frequency !== "Never" && (
                  <Text style={{ color: "#666", fontStyle: "italic" }}>
                    ({schedule.frequency})
                  </Text>
                )}
              </Text>
              {/* Delete watering/stop schedule button,*/}
              <TouchableOpacity 
                  onPress={() => handleCancelWatering(schedule.ruleId, schedule.frequency, schedule.dateKey)}
                  style={{ 
                    paddingVertical: 6, 
                    paddingHorizontal: 12, 
                    borderRadius: 4 
                  }}
                >
                  <Text style={{ color: 'red', fontSize: 12, fontWeight: '600' }}>
                    {schedule.frequency === "Never" ? "Delete Watering" : "Stop Schedule"}
                  </Text>
                </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}