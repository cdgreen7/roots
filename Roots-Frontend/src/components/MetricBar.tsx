import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/styles/global';
import { MetricStatus } from '@/data/plant';

type Props = {
  label: string;
  value: number;
  unit: string;
  max: number;
  range: [number, number];
  status: MetricStatus;
};

const statusText: Record<MetricStatus, string> = {
  low: 'Too low',
  ok: 'Healthy',
  high: 'Too high',
};

export default function MetricBar({ label, value, unit, max, range, status }: Props) {
  const fill = Math.min(Math.max(value / max, 0), 1);
  const barColor = status === 'ok' ? colors.text : colors.alert;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value}
          {unit}
        </Text>
      </View>

      <View style={styles.track}>
        {/* shaded band marks the plant's target range */}
        <View
          style={[
            styles.target,
            { left: `${(range[0] / max) * 100}%`, width: `${((Math.min(range[1], max) - range[0]) / max) * 100}%` },
          ]}
        />
        <View style={[styles.fill, { width: `${fill * 100}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.row}>
        <Text style={styles.hint}>
          Target {range[0]}–{range[1]}
          {unit}
        </Text>
        <Text style={[styles.hint, { color: barColor, fontWeight: '600' }]}>{statusText[status]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.header,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.header,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.background,
    marginVertical: 8,
    overflow: 'hidden',
  },
  target: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(39, 100, 31, 0.2)',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
