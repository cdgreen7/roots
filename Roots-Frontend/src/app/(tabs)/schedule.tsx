import { colors, globalStyles } from '@/styles/global';
import { Text, TextInput, TouchableOpacity, View, ScrollView, Alert, Button, Platform, Modal, StyleSheet} from 'react-native';
import { useState, useMemo } from 'react';
import { Calendar } from 'react-native-calendar-ui';
import DateTimePicker from '@react-native-community/datetimepicker';

type Frequency = 'Never' | 'Twice a Day' | 'Daily' | 'Weekly';
type CalendarGranularity = 'week' | 'month';

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

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PLANT_COLORS = ['#4b6888', '#2a2a4a', '#27641f', '#d18a32', '#228b8d'];

export default function ScheduleScreen() {
  const [calendarGranularity, setCalendarGranularity] = useState<CalendarGranularity>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date>(new Date());
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [wateringTime, setWateringTime] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('Never');
  const [plantName, setPlantName] = useState('');
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const eventColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    rules.forEach((rule, index) => {
      colorMap[rule.id] = PLANT_COLORS[index % PLANT_COLORS.length];
    });
    return colorMap;
  }, [rules]);
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  //Cancel scheduled events logic
  const handleCancelWatering = (ruleId: string, itemFrequency: Frequency, itemDateKey: string) => {
    if (itemFrequency === 'Never') {
      // Single event: complete removal
      setRules((currentRules) => currentRules.filter((rule) => rule.id !== ruleId));
    } else {
      // Recurring series: stop this one and all following instances
      setRules((currentRules) =>
        currentRules.map((rule) => {
          if (rule.id === ruleId) {
            const [year, month, day] = itemDateKey.split('-').map(Number);
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
      Alert.alert('Schedule Stopped', 'Future iterations of this schedule have been stopped.');
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
    if (frequency !== 'Never') {
      Alert.alert(
        `Watering scheduled for ${formattedDate} at ${formatTime(wateringTime)} with frequency: ${frequency}`
      );
    } else {
      Alert.alert(`Watering scheduled for ${formattedDate} at ${formatTime(wateringTime)}`);
    }
    setFrequency('Never');
    setPlantName('');
    setIsCreateModalVisible(false);
  };

  // Compute visible calendar dates 
  const visibleCalendarDates = useMemo(() => {
    const year = anchorDate.getFullYear();
    const month = anchorDate.getMonth();

    if (calendarGranularity === 'week') {
      const startOfWeek = new Date(anchorDate);
      startOfWeek.setHours(0, 0, 0, 0);
      startOfWeek.setDate(anchorDate.getDate() - anchorDate.getDay());

      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
      });
    } else {
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const startOffset = firstDayOfMonth.getDay();
      const totalDays = lastDayOfMonth.getDate();
      const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

      return Array.from({ length: totalCells }, (_, i) => {
        return new Date(year, month, 1 - startOffset + i);
      });
    }
  }, [anchorDate, calendarGranularity]);

  const getProjectedSchedules = (customEndDate?: Date): ProjectedDisplayItem[] => {
    const projections: ProjectedDisplayItem[] = [];
    //Set up reoccuring watering based on freqeuncy input
    rules.forEach((rule) => {
      const base =
        rule.baseDateObject instanceof Date
          ? rule.baseDateObject
          : new Date(rule.baseDateObject);

      const isPastEndDate = (target: Date) => {
        return rule.endDate !== undefined && formatDateKey(target) > rule.endDate;
      };

      if (rule.frequency === 'Never') {
        projections.push({
          ruleId: rule.id,
          plantName: rule.plantName,
          dateDisplay: rule.startDate,
          dateKey: formatDateKey(base),
          timeDisplay: rule.timeString,
          frequency: 'Never',
          sortTimestamp: base.getTime(),
        });
      }
      //Populate twice a day for 7 days, updates every time app is loaded to not overwhelm UI
      //Ex. Starting 10/10 populates through 10/17. Opening the app on 10/18 populates through 10/11 etc...
      else if (rule.frequency === 'Twice a Day') {
        let dayOffset = 0;
        let targetDay = new Date(base);
        const defaultWindow = new Date();
        defaultWindow.setDate(defaultWindow.getDate() + 7);
        const maxWindow = customEndDate && customEndDate > defaultWindow ? customEndDate : defaultWindow;
        while (targetDay <= maxWindow) {
          if (!isPastEndDate(targetDay)) {
            projections.push({
              ruleId: rule.id,
              plantName: rule.plantName,
              dateDisplay: targetDay.toLocaleDateString(),
              dateKey: formatDateKey(targetDay),
              timeDisplay: formatTime(targetDay),
              frequency: 'Twice a Day',
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
              frequency: 'Twice a Day',
              sortTimestamp: secondSlot.getTime(),
            });
          }

          dayOffset++;
          targetDay = new Date(base);
          targetDay.setDate(targetDay.getDate() + dayOffset);
        }
      }
      //Populates daily 14 days at a time
      else if (rule.frequency === 'Daily') {
        let dayOffset = 0;
        let runDate = new Date(base);
        const defaultWindow = new Date();
        defaultWindow.setDate(defaultWindow.getDate() + 14);
        const maxWindow = customEndDate && customEndDate > defaultWindow ? customEndDate : defaultWindow;
        while (runDate <= maxWindow) {
          if (!isPastEndDate(runDate)) {
            projections.push({
              ruleId: rule.id,
              plantName: rule.plantName,
              dateDisplay: runDate.toLocaleDateString(),
              dateKey: formatDateKey(runDate),
              timeDisplay: rule.timeString,
              frequency: 'Daily',
              sortTimestamp: runDate.getTime(),
            });
          }
          dayOffset++;
          runDate = new Date(base);
          runDate.setDate(runDate.getDate() + dayOffset);
        }
      }
      //Populates weekly 14 weeks at a time
      else if (rule.frequency === 'Weekly') {
        let weekOffset = 0;
        let runDate = new Date(base);
        const defaultWindow = new Date();
        defaultWindow.setDate(defaultWindow.getDate() + 14 * 7);
        const maxWindow = customEndDate && customEndDate > defaultWindow ? customEndDate : defaultWindow;
        while (runDate <= maxWindow) {
          if (!isPastEndDate(runDate)) {
            projections.push({
              ruleId: rule.id,
              plantName: rule.plantName,
              dateDisplay: runDate.toLocaleDateString(),
              dateKey: formatDateKey(runDate),
              timeDisplay: rule.timeString,
              frequency: 'Weekly',
              sortTimestamp: runDate.getTime(),
            });
          }
          weekOffset++;
          runDate = new Date(base);
          runDate.setDate(runDate.getDate() + weekOffset * 7);
        }
      }
    });
    return projections.sort((a, b) => a.sortTimestamp - b.sortTimestamp);
  };

  // Populate calendar view based on visible calendar dates
  const calendarSchedulesByDate = useMemo(() => {
    const lastVisibleDate = new Date(visibleCalendarDates[visibleCalendarDates.length - 1]);
    lastVisibleDate.setHours(23, 59, 59, 999);
    const allVisibleSchedules = getProjectedSchedules(lastVisibleDate);
    const map: Record<string, ProjectedDisplayItem[]> = {};
    allVisibleSchedules.forEach((item) => {
      if (!map[item.dateKey]) {
        map[item.dateKey] = [];
      }
      map[item.dateKey].push(item);
    });
    return map;
  }, [rules, visibleCalendarDates]);

  const visibleRangeEvents = useMemo(() => {
    const selectedKey = formatDateKey(calendarSelectedDate);
    const lastDate =
      calendarGranularity === 'month'
        ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
        : visibleCalendarDates[visibleCalendarDates.length - 1];
    const lastKey = formatDateKey(lastDate);
    return visibleCalendarDates
      .filter((date) => {
        const key = formatDateKey(date);
        return key >= selectedKey && key <= lastKey;
      })
      .flatMap((date) => calendarSchedulesByDate[formatDateKey(date)] || []);
  }, [anchorDate, calendarGranularity, calendarSelectedDate, calendarSchedulesByDate, visibleCalendarDates]);
  
  const visibleRangeEndDate =
    calendarGranularity === 'month'
      ? new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0)
      : visibleCalendarDates[visibleCalendarDates.length - 1];

  const visiblePlantLegend = useMemo(() => {
    const seenEvents = new Set<string>();
    return Object.values(calendarSchedulesByDate)
      .flat()
      .filter((schedule) => {
        if (seenEvents.has(schedule.ruleId)) {
          return false;
        }
        seenEvents.add(schedule.ruleId);
        return true;
      })
      .map((schedule) => {
        const ruleIndex = rules.findIndex((rule) => rule.id === schedule.ruleId);
        return {
          key: schedule.ruleId,
          name: schedule.plantName.trim() || `Plant ${ruleIndex + 1}`,
          color: eventColors[schedule.ruleId],
        };
      });
  }, [calendarSchedulesByDate, eventColors, rules]);

  const navigateCalendar = (direction: -1 | 1) => {
    const next = new Date(anchorDate);
    if (calendarGranularity === 'week') {
      next.setDate(anchorDate.getDate() + direction * 7);
    } else {
      next.setMonth(anchorDate.getMonth() + direction);
    }
    setAnchorDate(next);
  };

  const getCalendarHeaderLabel = () => {
    if (calendarGranularity === 'month') {
      return anchorDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
    }
    const start = visibleCalendarDates[0];
    const end = visibleCalendarDates[visibleCalendarDates.length - 1];
    const startStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  };

  const renderEventRow = (schedule: ProjectedDisplayItem, index: number) => (
    <View
      key={`${schedule.ruleId}-${schedule.sortTimestamp}-${index}`}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        paddingBottom: 8,
      }}
    >
      <View
        style={[
          styles.eventDot,
          { backgroundColor: eventColors[schedule.ruleId] || PLANT_COLORS[0], marginRight: 8 },
        ]}
      />
      <Text style={{ fontSize: 15, flex: 1, color: '#222' }}>
  🌱 {schedule.plantName ? `${schedule.plantName} — ` : ''}
  {schedule.dateDisplay} — {schedule.timeDisplay}{' '}
  {schedule.frequency !== 'Never' && (
    <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
      ({schedule.frequency})
    </Text>
      )}
    </Text>
    {/* Delete watering/stop schedule button,*/}
    <TouchableOpacity
      onPress={() => handleCancelWatering(schedule.ruleId, schedule.frequency, schedule.dateKey)}
      style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 }}
    >
      <Text style={{ color: colors.alert, fontSize: 12, fontWeight: '600' }}>
        {schedule.frequency === 'Never' ? 'Delete Watering' : 'Stop Schedule'}
      </Text>
    </TouchableOpacity>
        </View>
      );
  return (
    <View style={[globalStyles.container, { flex: 1 }]}>
      {/* Top Header with Upper-Right Schedule Watering Button */}
      <View style={styles.headerRow}>
        <Text style={[globalStyles.title, { marginBottom: 0 }]}>Watering Schedule</Text>
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => {
            setSelectedDate(new Date());
            setIsCreateModalVisible(true);
          }}
        >
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ marginTop: 10 }}>
            {/* Week / Month Switcher & Calendar Navigation */}
            <View style={styles.calendarToolbar}>
              <View style={styles.navGroup}>
                <TouchableOpacity onPress={() => navigateCalendar(-1)} style={styles.navBtn}>
                  <Text style={styles.navBtnText}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.calendarRangeTitle}>{getCalendarHeaderLabel()}</Text>
                <TouchableOpacity onPress={() => navigateCalendar(1)} style={styles.navBtn}>
                  <Text style={styles.navBtnText}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.granularityToggle}>
                <TouchableOpacity
                  style={[
                    styles.granularityBtn,
                    calendarGranularity === 'week' && styles.granularityBtnActive,
                  ]}
                  onPress={() => setCalendarGranularity('week')}
                >
                  <Text
                    style={[
                      styles.granularityText,
                      calendarGranularity === 'week' && styles.granularityTextActive,
                    ]}
                  >
                    Week
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.granularityBtn,
                    calendarGranularity === 'month' && styles.granularityBtnActive,
                  ]}
                  onPress={() => setCalendarGranularity('month')}
                >
                  <Text
                    style={[
                      styles.granularityText,
                      calendarGranularity === 'month' && styles.granularityTextActive,
                    ]}
                  >
                    Month
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Day of Week Headers */}
            <View style={styles.weekHeaderRow}>
              {DAYS_OF_WEEK.map((day) => (
                <Text key={day} style={styles.weekHeaderCell}>
                  {day}
                </Text>
              ))}
            </View>
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {visibleCalendarDates.map((dateObj, idx) => {
                const key = formatDateKey(dateObj);
                const dayEvents = calendarSchedulesByDate[key] || [];
                const daySchedules = dayEvents.filter(
                  (event, index) =>
                    dayEvents.findIndex((candidate) => candidate.ruleId === event.ruleId) === index
                );
                const isSelected = formatDateKey(calendarSelectedDate) === key;
                const isToday = formatDateKey(new Date()) === key;
                const isOutsideMonth =
                  calendarGranularity === 'month' && dateObj.getMonth() !== anchorDate.getMonth();
                return (
                  <TouchableOpacity
                    key={`${key}-${idx}`}
                    onPress={() => setCalendarSelectedDate(dateObj)}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        isOutsideMonth && { color: '#bbb' },
                        isSelected && { color: '#fff', fontWeight: 'bold' },
                      ]}
                    >
                      {dateObj.getDate()}
                    </Text>
                    {dayEvents.length > 0 && (
                      <View style={styles.dotContainer}>
                        {daySchedules.slice(0, 3).map((event) => (
                          <View
                            key={event.ruleId}
                            style={[
                              styles.eventDot,
                              {
                                backgroundColor: eventColors[event.ruleId] || PLANT_COLORS[0],
                              },
                              isSelected && styles.eventDotSelected,
                            ]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.eventLegend}>
              {visiblePlantLegend.map((plant) => (
                <View key={plant.key} style={styles.legendItem}>
                  <View
                    style={[
                      styles.eventDot,
                      { backgroundColor: plant.color || PLANT_COLORS[0] },
                    ]}
                  />
                  <Text style={styles.legendText}>{plant.name}</Text>
                </View>
              ))}
            </View>
            {/* Selected Day Events */}
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                Events from {calendarSelectedDate.toLocaleDateString()} to{' '}
                {visibleRangeEndDate.toLocaleDateString()}
              </Text>
              {visibleRangeEvents.length === 0 ? (
                <Text style={{ marginTop: 8, color: '#666' }}>
                  No watering scheduled for this date range.
                </Text>
              ) : (
                visibleRangeEvents.map((schedule, index) => renderEventRow(schedule, index))
              )}
            </View>
        </View>
      </ScrollView>
      {/* Schedule Button pinned to bottom */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.scheduleButton}
          onPress={() => {
            setSelectedDate(new Date());
            setIsCreateModalVisible(true);
          }}
        >
          <Text style={styles.scheduleButtonText}>Schedule Watering</Text>
        </TouchableOpacity>
      </View>
      {/* Create Scheduling Event Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <ScrollView style={[globalStyles.container, { paddingTop: 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={[globalStyles.title, { marginBottom: 0 }]}>Watering Schedule</Text>
            <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
              <Text style={{ color: '#4b6888', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Calendar
            onDateSelect={(date) => setSelectedDate(date)}
            colors={{ primary: '#4b6888', selectedText: '#ffffff' }}
          />
          {/* Optional Plant name to associate with watering event*/}
          <View
            style={{
              marginTop: 5,
              borderTopWidth: 1,
              borderColor: '#eee',
              paddingTop: 20,
              paddingBottom: 40,
            }}
          >
            <Text style={{ marginBottom: 5, fontWeight: 'bold', fontSize: 16 }}>
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
                borderColor: '#ccc',
                borderRadius: 5,
                padding: 10,
                marginBottom: 15,
                backgroundColor: '#fff',
              }}
            />
            <Text
              style={{
                marginBottom: 5,
                fontWeight: 'bold',
                fontSize: 16,
                color: selectedDate ? '#000' : '#888',
              }}
            >
              Selected Date: {selectedDate ? selectedDate.toLocaleDateString() : 'Never selected'}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 5,
                height: 40,
                gap: 15,
              }}
            >
              <Text
                style={{
                  fontWeight: 'bold',
                  fontSize: 16,
                  color: selectedDate ? '#000' : '#888',
                }}
              >
                Watering Time:
              </Text>
              {/*Checks if platform is ios, if yes uses ios time picker, if not uses other time picker option*/}
              {Platform.OS === 'ios' ? (
                <View
                  pointerEvents={selectedDate ? 'auto' : 'none'}
                  style={{ opacity: selectedDate ? 1 : 0.5 }}
                >
                  <DateTimePicker
                    value={wateringTime}
                    mode="time"
                    display="compact"
                    onValueChange={(event, date) => {
                      if (date) setWateringTime(date);
                    }}
                  />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    disabled={!selectedDate}
                    onPress={() => setShowPicker(!showPicker)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 4,
                      backgroundColor: selectedDate ? '#eee' : '#f5f5f5',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: selectedDate ? '#000' : '#aaa',
                        fontWeight: '500',
                      }}
                    >
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
            <Text
              style={{
                fontWeight: 'bold',
                fontSize: 16,
                marginBottom: 10,
                color: selectedDate ? '#000' : '#888',
              }}
            >
              Repeat Frequency
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5, gap: 10 }}>
              {(['Never', 'Twice a Day', 'Daily', 'Weekly'] as Frequency[]).map((f) => {
                const isSelected = frequency === f;
                return (
                  <TouchableOpacity
                    key={f}
                    disabled={!selectedDate}
                    onPress={() => setFrequency(f)}
                    style={{
                      minWidth: '45%',
                      flexGrow: 1,
                      padding: 10,
                      borderWidth: 1,
                      borderRadius: 5,
                      alignItems: 'center',
                      borderColor: !selectedDate ? '#eee' : isSelected ? '#4b6888' : '#ccc',
                      backgroundColor: !selectedDate
                        ? '#fcfcfc'
                        : isSelected
                        ? '#4b6888'
                        : 'transparent',
                    }}
                  >
                    <Text style={{ color: !selectedDate ? '#aaa' : isSelected ? '#fff' : '#000' }}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button title="Schedule Watering" onPress={scheduleWatering} disabled={!selectedDate} />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navGroup: {
    flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  },
  navBtn: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  backgroundColor: '#f0f2f5',
  borderRadius: 4,
  },
  navBtnText: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#4b6888',
  },
  calendarRangeTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#222',
  },
  granularityToggle: {
  flexDirection: 'row',
  borderWidth: 1,
  borderColor: '#4b6888',
  borderRadius: 6,
  overflow: 'hidden',
  },
  granularityBtn: {
  paddingVertical: 4,
  paddingHorizontal: 10,
  },
  granularityBtnActive: {
  backgroundColor: '#4b6888',
  },
  granularityText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#4b6888',
  },
  granularityTextActive: {
  color: '#fff',
  },
  weekHeaderRow: {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderColor: '#eee',
  paddingBottom: 6,
  marginBottom: 4,
  },
  weekHeaderCell: {
  width: '14.28%',
  textAlign: 'center',
  fontSize: 12,
  fontWeight: '600',
  color: '#666',
  },
  calendarGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  },
  dayCell: {
  width: '14.28%',
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 6,
  marginVertical: 2,
  },
  dayCellSelected: {
  backgroundColor: '#4b6888',
  },
  dayCellToday: {
  borderWidth: 1,
  borderColor: '#4b6888',
  },
  dayNumber: {
  fontSize: 14,
  color: '#222',
  },
  dotContainer: {
  flexDirection: 'row',
  gap: 3,
  marginTop: 3,
  },
  eventDot: {
  width: 5,
  height: 5,
  borderRadius: 2.5,
  backgroundColor: '#4b6888',
  },
  eventDotSelected: {
  borderWidth: 1,
  borderColor: '#fff',
  },
  eventLegend: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 10,
  },
  legendItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 5,
  },
  legendText: {
  fontSize: 11,
  color: '#666',
  },
  modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
  },
    bottomBar: {
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: 'transparent',
  },
  scheduleButton: {
    backgroundColor: '#4b6888',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scheduleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});