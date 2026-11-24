import { useEffect, useMemo, useState } from 'react';
import { subscribeSiteProfile } from '../services/firestoreService';
import { fetchLocalPublicPortfolio } from '../services/localMediaService';
import { DEFAULT_SITE_PROFILE, type SiteProfileRecord } from '../types';
import {
  getLatestProfileOverride,
  resolveTimestampMs,
  subscribeSiteContentSync,
} from '../utils/siteContentSync';

export function useSiteProfile(): SiteProfileRecord {
  const [firebaseProfile, setFirebaseProfile] = useState<SiteProfileRecord | null>(null);
  const [localProfile, setLocalProfile] = useState<SiteProfileRecord | null>(null);
  const [syncOverride, setSyncOverride] = useState(() => getLatestProfileOverride());

  useEffect(() => {
    let mounted = true;
    fetchLocalPublicPortfolio().then((res) => {
      if (!mounted) return;
      setLocalProfile(res.profile ?? null);
    });
    const unsubscribeFirestore = subscribeSiteProfile(
      (prof) => {
        if (!mounted) return;
        setFirebaseProfile(prof);
      },
      () => {
        // Fallback gracefully to local/default profile
      }
    );
    const unsubscribeSync = subscribeSiteContentSync({
      onProfile: (entry) => {
        if (!mounted) return;
        setSyncOverride(entry);
        if (entry.value) {
          setLocalProfile(entry.value);
        }
      },
    });
    return () => {
      mounted = false;
      unsubscribeFirestore();
      unsubscribeSync();
    };
  }, []);

  return useMemo<SiteProfileRecord>(() => {
    const fbTs = resolveTimestampMs(firebaseProfile);
    const localTs = resolveTimestampMs(localProfile);
    const overrideTs = syncOverride?.ts ?? 0;

    if (syncOverride && overrideTs >= fbTs && overrideTs >= localTs) {
      return syncOverride.value ?? DEFAULT_SITE_PROFILE;
    }
    if (firebaseProfile && localProfile) {
      return localTs > fbTs ? localProfile : firebaseProfile;
    }
    return firebaseProfile ?? localProfile ?? DEFAULT_SITE_PROFILE;
  }, [firebaseProfile, localProfile, syncOverride]);
}
