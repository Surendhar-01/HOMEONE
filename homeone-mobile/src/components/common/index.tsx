import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PrimaryButton({ title, onPress, loading, disabled }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      className={`mt-2 items-center rounded-xl py-4 ${off ? 'bg-slate-300' : 'bg-blue-700'}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-base font-bold text-white">{title}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, loading, disabled }: ButtonProps) {
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      className={`mt-2 items-center rounded-xl border border-blue-700 bg-white py-4 ${
        off ? 'opacity-50' : ''
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#1D4ED8" />
      ) : (
        <Text className="text-base font-bold text-blue-700">{title}</Text>
      )}
    </Pressable>
  );
}

export function LinkButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center py-2.5">
      <Text className="text-sm font-semibold text-blue-700">{title}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

interface InputProps extends TextInputProps {
  label: string;
  error?: string | null;
}

/**
 * Autofill is disabled by default so one-tap testing and OTP flows are never
 * contaminated by saved credentials. Pass autoComplete explicitly to opt back
 * in for a specific field.
 */
export function CustomInput({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-[13px] font-semibold text-slate-900">{label}</Text>
      <TextInput
        className={`rounded-[10px] border bg-white px-3 py-3 text-[15px] text-slate-900 ${
          error ? 'border-red-500' : 'border-slate-200'
        }`}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoComplete="off"
        importantForAutofill="no"
        {...props}
      />
      {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}

export function PasswordInput({
  label,
  ...props
}: Omit<InputProps, 'secureTextEntry'>) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-[13px] font-semibold text-slate-900">{label}</Text>
      <View className="flex-row items-center rounded-[10px] border border-slate-200 bg-white pr-2">
        <TextInput
          className="flex-1 px-3 py-3 text-[15px] text-slate-900"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoComplete="off"
          secureTextEntry={!visible}
          importantForAutofill="no"
          {...props}
        />
        <Pressable onPress={() => setVisible((v) => !v)} className="px-2 py-2">
          <Text className="text-sm font-semibold text-blue-700">{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      {props.error ? <Text className="mt-1 text-xs text-red-600">{props.error}</Text> : null}
    </View>
  );
}

export function PhoneInput(props: Omit<InputProps, 'keyboardType'>) {
  return <CustomInput keyboardType="phone-pad" placeholder="+919876543210" {...props} />;
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

export function LoadingIndicator({ message }: { message?: string }) {
  return (
    <View className="items-center justify-center py-8">
      <ActivityIndicator size="large" color="#1D4ED8" />
      {message ? <Text className="mt-3 text-sm text-slate-500">{message}</Text> : null}
    </View>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="mb-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5">
      <Text className="text-[13px] leading-5 text-red-700">{message}</Text>
    </View>
  );
}

export function SuccessMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View className="mb-3 rounded-[10px] border border-teal-200 bg-teal-50 px-3 py-2.5">
      <Text className="text-[13px] leading-5 text-teal-800">{message}</Text>
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View className="items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8">
      <Text className="text-base font-bold text-slate-700">{title}</Text>
      {message ? (
        <Text className="mt-1 text-center text-sm text-slate-500">{message}</Text>
      ) : null}
    </View>
  );
}

const STATUS_BG: Record<string, string> = {
  REQUESTED: 'bg-amber-100',
  ACCEPTED: 'bg-blue-100',
  REJECTED: 'bg-red-100',
  CANCELLED: 'bg-slate-200',
  ON_THE_WAY: 'bg-indigo-100',
  ARRIVED: 'bg-indigo-100',
  IN_PROGRESS: 'bg-teal-100',
  COMPLETED: 'bg-green-100',
};

const STATUS_TEXT: Record<string, string> = {
  REQUESTED: 'text-amber-800',
  ACCEPTED: 'text-blue-800',
  REJECTED: 'text-red-800',
  CANCELLED: 'text-slate-600',
  ON_THE_WAY: 'text-indigo-800',
  ARRIVED: 'text-indigo-800',
  IN_PROGRESS: 'text-teal-800',
  COMPLETED: 'text-green-800',
};

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${STATUS_BG[status] ?? 'bg-slate-100'}`}>
      <Text className={`text-[11px] font-bold ${STATUS_TEXT[status] ?? 'text-slate-600'}`}>
        {STATUS_LABEL[status] ?? status}
      </Text>
    </View>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="mb-3.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {children}
    </View>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-4">
      <Text className="text-[26px] font-bold text-slate-900">{title}</Text>
      {subtitle ? <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text> : null}
    </View>
  );
}

export function Screen({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 bg-white px-5 pt-4">{children}</View>;
}
