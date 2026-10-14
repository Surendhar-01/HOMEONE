import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  approveProvider,
  blockProvider,
  getProviderDetail,
  getProviderDocuments,
  rejectProvider,
} from '../../src/services/adminService';
import {
  Card,
  CustomInput,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SuccessMessage,
} from '../../src/components/common';

interface ProviderDetail {
  id: string;
  fullName: string | null;
  mobileNumber: string | null;
  email: string | null;
  domainName: string | null;
  skills: string[];
  yearsOfExperience: number;
  languagesSpoken: string[];
  businessAddress: string;
  latitude: number | null;
  longitude: number | null;
  workingHours: { dayOfWeek: number; startTime: string; endTime: string }[];
  verificationStatus: string;
  verificationReason: string | null;
}

interface AdminDocument {
  id: string;
  documentType: string;
  originalFilename: string | null;
  signedUrl: string;
}

export default function AdminProviderReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [providerDetail, docs] = await Promise.all([
        getProviderDetail(id),
        getProviderDocuments(id),
      ]);
      setDetail(providerDetail as ProviderDetail);
      setDocuments(docs as AdminDocument[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the provider.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(kind: 'approve' | 'reject' | 'block') {
    setError(null);
    setInfo(null);
    if (kind !== 'approve' && reason.trim().length < 3) {
      setError('A reason of at least 3 characters is required to reject or block.');
      return;
    }
    setBusy(true);
    try {
      const result =
        kind === 'approve'
          ? await approveProvider(id as string)
          : kind === 'reject'
            ? await rejectProvider(id as string, reason.trim())
            : await blockProvider(id as string, reason.trim());
      const action = result as { title: string; message: string };
      setInfo(`${action.title}: ${action.message}`);
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading provider…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        {detail ? (
          <Card>
            <Text className="text-lg font-bold text-slate-900">
              {detail.fullName ?? 'Unnamed provider'}
            </Text>
            <Text className="text-sm text-slate-600">
              {detail.email ?? ''} • {detail.mobileNumber ?? ''}
            </Text>
            <Text className="mt-1 text-sm text-slate-600">Domain: {detail.domainName ?? '—'}</Text>
            <Text className="text-sm text-slate-600">
              Skills: {(detail.skills ?? []).join(', ')}
            </Text>
            <Text className="text-sm text-slate-600">
              Experience: {detail.yearsOfExperience} years
            </Text>
            <Text className="text-sm text-slate-600">
              Languages: {(detail.languagesSpoken ?? []).join(', ')}
            </Text>
            <Text className="text-sm text-slate-600">Address: {detail.businessAddress}</Text>
            {detail.latitude !== null && detail.longitude !== null ? (
              <Text className="text-xs text-slate-400">
                GPS: {detail.latitude.toFixed(5)}, {detail.longitude.toFixed(5)}
              </Text>
            ) : null}
            <Text className="text-sm text-slate-600">
              Hours:{' '}
              {(detail.workingHours ?? [])
                .map((h) => `day ${h.dayOfWeek} ${h.startTime}-${h.endTime}`)
                .join(' • ')}
            </Text>
            <Text className="mt-2 text-sm font-bold text-slate-900">
              Status: {detail.verificationStatus}
            </Text>
            {detail.verificationReason ? (
              <Text className="text-sm text-slate-600">Reason: {detail.verificationReason}</Text>
            ) : null}
          </Card>
        ) : null}

        <Text className="mb-2 text-base font-bold text-slate-900">
          Documents ({documents.length})
        </Text>
        {documents.map((doc) => (
          <Card key={doc.id}>
            <Text className="text-sm font-bold text-slate-900">{doc.documentType}</Text>
            {doc.signedUrl ? (
              <Image
                source={{ uri: doc.signedUrl }}
                className="mt-2 h-56 w-full rounded-lg"
                resizeMode="contain"
              />
            ) : null}
            <Text className="mt-1 text-xs text-slate-400">{doc.originalFilename ?? ''}</Text>
          </Card>
        ))}

        <Card>
          <Text className="mb-2 text-base font-bold text-slate-900">Verification Action</Text>
          <CustomInput
            label="Reason (required for reject / block)"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="Why is this being rejected or blocked?"
          />
          <PrimaryButton title="Approve" onPress={() => act('approve')} loading={busy} />
          <View className="mt-1">
            <SecondaryButton title="Reject" onPress={() => act('reject')} loading={busy} />
          </View>
          <View className="mt-1">
            <SecondaryButton title="Block" onPress={() => act('block')} loading={busy} />
          </View>
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}