import { colors, globalStyles } from '@/styles/global';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Text, ScrollView, View, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import HomeHeader from '../../components/HomeHeader';
import MetricBar from '@/components/MetricBar';
import {
  Actuator,
  actuatorLabels,
  currentReading,
  initialActuatorState,
  metricRange,
  metrics,
  metricStatus,
  plantName,
  plantRules,
} from '@/data/plant';
import { formatSchedule, useSchedules } from '@/state/schedule';
import { useNow } from '@/hooks/useNow';

export default function HomeScreen() {
  // Local until the actuator_state API exists; would be sent to the board over MQTT.
  const [actuators, setActuators] = useState(initialActuatorState);
  const { schedules } = useSchedules();
  const now = useNow();
  const nextWatering = schedules.find((s) => s.at.getTime() > now);

  const alerts = metrics.filter(
    (m) => metricStatus(m.key, currentReading[m.key], plantRules) !== 'ok'
  );

  const toggle = (actuator: Actuator, on: boolean) => {
    console.log('Toggled:', actuator, on ? 'on' : 'off');
    setActuators((current) => ({ ...current, [actuator]: on }));
  };

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={styles.content}>
      <Text style={globalStyles.title}>Roots Dashboard</Text>
      <HomeHeader />

      <View style={styles.summary}>
        <Text style={styles.plantName}>{plantName}</Text>
        <Text style={[styles.summaryText, alerts.length > 0 && { color: colors.alert }]}>
          {alerts.length === 0
            ? 'All conditions look healthy'
            : `Needs attention: ${alerts.map((m) => m.label).join(', ')}`}
        </Text>
      </View>

      <Text style={globalStyles.sectionTitle}>Current Conditions</Text>
      {metrics.map((m) => (
        <MetricBar
          key={m.key}
          label={m.label}
          value={currentReading[m.key]}
          unit={m.unit}
          max={m.max}
          range={metricRange(m.key, plantRules)}
          status={metricStatus(m.key, currentReading[m.key], plantRules)}
        />
      ))}

      <Text style={globalStyles.sectionTitle}>Controls</Text>
      <View style={styles.card}>
        {(Object.keys(actuatorLabels) as Actuator[]).map((actuator, i) => (
          <View key={actuator} style={[styles.controlRow, i > 0 && styles.divider]}>
            <Text style={styles.controlLabel}>{actuatorLabels[actuator]}</Text>
            <Switch
              value={actuators[actuator]}
              onValueChange={(on) => toggle(actuator, on)}
              trackColor={{ true: colors.text }}
            />
          </View>
        ))}
      </View>

      <Text style={globalStyles.sectionTitle}>Next Watering</Text>
      <Link href='/schedule' asChild onPress={() => console.log('Pressed: Next Watering')}>
        <TouchableOpacity style={styles.card}>
          <Text style={styles.controlLabel}>
            {nextWatering ? `🌱 ${formatSchedule(nextWatering.at)}` : 'Nothing scheduled'}
          </Text>
          <Text style={styles.link}>Manage schedule →</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 40,
  },
  summary: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
  },
  plantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.header,
  },
  summaryText: {
    marginTop: 4,
    fontSize: 14,
    color: colors.text,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.textSecondary,
  },
  controlLabel: {
    fontSize: 16,
    color: colors.header,
    paddingVertical: 8,
  },
  link: {
    color: colors.text,
    fontWeight: '600',
    paddingBottom: 10,
  },
});
