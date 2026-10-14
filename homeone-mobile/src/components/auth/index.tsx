import React, { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

/* ------------------------------------------------------------------ */
/* OTPInput: six single-digit boxes with auto-advance                   */
/* ------------------------------------------------------------------ */

export function OTPInput({
  length = 6,
  value,
  onChange,
}: {
  length?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  const refs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  function handleChange(index: number, text: string) {
    const clean = text.replace(/\D/g, '');
    const next = value.split('');
    if (clean) {
      next[index] = clean[clean.length - 1];
      const joined = next.join('').slice(0, length);
      onChange(joined);
      if (index < length - 1) refs.current[index + 1]?.focus();
    } else {
      next[index] = '';
      onChange(next.join(''));
      if (index > 0) refs.current[index - 1]?.focus();
    }
  }

  return (
    <View className="flex-row justify-between">
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          value={digit.trim()}
          onChangeText={(text) => handleChange(index, text)}
          onFocus={() => setFocused(index)}
          onBlur={() => setFocused(null)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          autoComplete="off"
          importantForAutofill="no"
          className={`h-14 w-12 rounded-xl border-2 bg-white text-center text-xl font-bold text-slate-900 ${
            focused === index ? 'border-blue-700' : 'border-slate-200'
          }`}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* RoleSelectionCard                                                   */
/* ------------------------------------------------------------------ */

export function RoleSelectionCard({
  icon,
  title,
  description,
  buttonTitle,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  buttonTitle: string;
  onPress: () => void;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <Text className="text-3xl">{icon}</Text>
      </View>
      <Text className="text-lg font-bold text-slate-900">{title}</Text>
      <Text className="mb-4 mt-1 text-sm leading-5 text-slate-500">{description}</Text>
      <Pressable onPress={onPress} className="items-center rounded-xl bg-blue-700 py-3.5">
        <Text className="text-[15px] font-bold text-white">{buttonTitle}</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* CategoryCard (dashboard placeholders)                               */
/* ------------------------------------------------------------------ */

export function CategoryCard({
  icon,
  title,
  onPress,
}: {
  icon: string;
  title: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 w-[48%] items-center rounded-2xl border border-slate-200 bg-white px-2 py-5 shadow-sm"
    >
      <View className="mb-2 h-12 w-12 items-center justify-center rounded-full bg-teal-50">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <Text className="text-center text-[13px] font-semibold text-slate-800">{title}</Text>
      <Text className="mt-1 text-[11px] text-slate-400">Feature Coming Soon</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* StatusCard: verification status display                             */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  PENDING: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800' },
  APPROVED: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800' },
  REJECTED: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800' },
  BLOCKED: { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-800' },
};

export function StatusCard({
  title,
  message,
  status,
  reason,
}: {
  title: string;
  message: string;
  status: string;
  reason?: string | null;
}) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.PENDING;
  return (
    <View className={`mb-3.5 rounded-2xl border ${style.border} ${style.bg} p-4`}>
      <Text className={`text-lg font-bold ${style.text}`}>{title}</Text>
      <Text className={`mt-2 text-sm leading-5 ${style.text}`}>{message}</Text>
      {reason ? (
        <Text className={`mt-2 text-sm font-semibold ${style.text}`}>Reason: {reason}</Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* RegistrationProgress: step dots + bar                               */
/* ------------------------------------------------------------------ */

export function RegistrationProgress({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <View className="mb-5">
      <View className="mb-2 flex-row justify-between">
        {labels.map((label, index) => (
          <Text
            key={label}
            className={`text-[11px] font-semibold ${
              index <= current ? 'text-blue-700' : 'text-slate-400'
            }`}
          >
            {label}
          </Text>
        ))}
      </View>
      <View className="h-2 flex-row gap-1">
        {Array.from({ length: total }).map((_, index) => (
          <View
            key={index}
            className={`flex-1 rounded-full ${index <= current ? 'bg-blue-700' : 'bg-slate-200'}`}
          />
        ))}
      </View>
      <Text className="mt-1.5 text-xs text-slate-500">
        Step {current + 1} of {total}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chip: multi-select pill                                             */
/* ------------------------------------------------------------------ */

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full border px-3.5 py-2 ${
        selected ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'
      }`}
    >
      <Text className={`text-[13px] ${selected ? 'font-bold text-blue-800' : 'text-slate-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* FileUploadField                                                     */
/* ------------------------------------------------------------------ */

export function FileUploadField({
  label,
  fileName,
  onPress,
  hint,
}: {
  label: string;
  fileName: string | null;
  onPress: () => void;
  hint?: string;
}) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-[13px] font-semibold text-slate-900">{label}</Text>
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-between rounded-[10px] border border-dashed border-slate-300 bg-slate-50 px-3 py-3.5"
      >
        <Text className="flex-1 text-sm text-slate-600" numberOfLines={1}>
          {fileName ?? 'Tap to choose a file'}
        </Text>
        <Text className="ml-2 text-sm font-bold text-blue-700">Browse</Text>
      </Pressable>
      {hint ? <Text className="mt-1 text-xs text-slate-400">{hint}</Text> : null}
    </View>
  );
}
