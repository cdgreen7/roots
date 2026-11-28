/*
 * Building blocks for the plant settings screen,
 * essentially a titled section with a Save button, a number input, and an on/off switch row.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Rules, updateRules } from '../../api/control';

type SectionProps = {
  title: string;
  children: React.ReactNode;
  onSave?: () => void;  // omit for sections without a Save button
  saving?: boolean;
  disabled?: boolean;
};

export function SettingsSection({ title, children, onSave, saving, disabled }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      {onSave && (
        <Pressable
          style={[styles.saveButton, (disabled || saving) && styles.saveButtonDisabled]}
          onPress={onSave}
          disabled={disabled || saving}
        >
          {saving ? <ActivityIndicator color='#fff' /> : <Text style={styles.saveText}>Save</Text>}
        </Pressable>
      )}
    </View>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  hint?: string;
};

export function NumberField({ label, value, onChangeText, unit, hint }: NumberFieldProps) {
  return (
    <View style={styles.row}>
      <View style={styles.labelBox}>
        <Text style={styles.label}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType='decimal-pad'
        placeholder='--'
        placeholderTextColor='#999'
      />
      {unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function ToggleRow({ label, value, onValueChange }: ToggleRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, styles.labelBox]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

// toText turns a stored rule into text for a NumberField ("" when the board hasn't reported it).
export function toText(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

// parseField reads a NumberField's text. Throws an Error with a readable message if it's empty or out of range.
export function parseField(text: string, label: string, min: number, max: number, integer = false): number {
  const value = Number(text.trim());
  if (text.trim() === '' || Number.isNaN(value)) throw new Error(`Enter a number for ${label}.`);
  if (integer && !Number.isInteger(value)) throw new Error(`${label} must be a whole number.`);
  if (value < min || value > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}

/*
  useSaveRules returns save(changes), which sends rule changes to the board (PUT /rules) and passes the
  updated rule set to onSaved. build() makes the changes; if it throws (a bad field), nothing is sent.
*/
export function useSaveRules(plantId: string, onSaved: (rules: Rules) => void) {
  const [saving, setSaving] = useState(false);

  const save = async (build: () => Partial<Rules>) => {
    let changes: Partial<Rules>;
    try {
      changes = build();
    } catch (e) {
      Alert.alert('Check your settings', e instanceof Error ? e.message : String(e));
      return;
    }
    setSaving(true);
    try {
      onSaved(await updateRules(plantId, changes));
      Alert.alert('Saved', 'The board is using the new settings.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return { saving, save };
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#27641f',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelBox: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#242444',
  },
  hint: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  input: {
    width: 70,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    textAlign: 'right',
  },
  unit: {
    width: 36,
    marginLeft: 6,
    fontSize: 15,
    color: '#555',
  },
  saveButton: {
    backgroundColor: '#27641f',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});