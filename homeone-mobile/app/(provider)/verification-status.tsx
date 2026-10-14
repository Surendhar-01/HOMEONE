import { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { ApiError } from '../../src/services/api';
import { getVerificationStatus } from '../../src/services/providerService';
import type { VerificationStatusInfo } from '../../src/types';
import { StatusCard } from '../../src/components/auth';
import {
  Card,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
} from '../../src/components/common';

export default function VerificationStatus() {
  const [status, setStatus] = useState<VerificationStatusInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setStatus(await getVerificationStatus());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Checking verification status…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        {status ? (
          <StatusCard
            title={status.title}
            message={status.message}
            status={status.verificationStatus}
            reason={status.verificationReason}
          />
        ) : (
          <Card>
            <ErrorMessage message={error ?? 'No verification status found.'} />
          </Card>
        )}
        <PrimaryButton title="Refresh Status" onPress={load} />
      </ScrollView>
    </Screen>
  );
}