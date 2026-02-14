import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { Firm, FirmMember, FirmInvite, FirestoreReportMetadata } from '@/types/firebase';
import { FirmBranding } from '@/types/branding';
import { SavedReport, ReportFormData } from '@/types/report';
import { TrialRecord, Subscription, TRIAL_LIMIT, MAX_DEVICES_PER_ACCOUNT } from '@/types/subscription';
import { updateUserFirmId, clearUserFirmId } from './auth';
import { arrayUnion, increment } from 'firebase/firestore';
import { deleteReportPhotos } from './photo-storage';

// ============ FIRM FUNCTIONS ============

export async function createFirm(
  name: string,
  userId: string,
  userEmail: string,
  userDisplayName: string
): Promise<string> {
  // Create firm document
  const firmRef = doc(collection(db, 'firms'));
  const firmId = firmRef.id;

  await setDoc(firmRef, {
    name,
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  // Add user as owner member
  const memberRef = doc(db, 'firms', firmId, 'members', userId);
  await setDoc(memberRef, {
    email: userEmail.toLowerCase(), // Normalize email
    displayName: userDisplayName,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  // Update user's firmId
  await updateUserFirmId(userId, firmId);

  return firmId;
}

export async function getFirm(firmId: string): Promise<Firm | null> {
  const firmRef = doc(db, 'firms', firmId);
  const firmSnap = await getDoc(firmRef);

  if (firmSnap.exists()) {
    return { id: firmSnap.id, ...firmSnap.data() } as Firm;
  }
  return null;
}

export async function getFirmMembers(firmId: string): Promise<FirmMember[]> {
  const membersRef = collection(db, 'firms', firmId, 'members');
  const membersSnap = await getDocs(membersRef);

  return membersSnap.docs.map((doc) => ({
    userId: doc.id,
    ...doc.data(),
  })) as FirmMember[];
}

// ============ BRANDING FUNCTIONS ============

export async function updateFirmBranding(
  firmId: string,
  branding: Partial<FirmBranding>,
  userId: string
): Promise<void> {
  const firmRef = doc(db, 'firms', firmId);
  await updateDoc(firmRef, {
    branding: {
      ...branding,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    },
  });
}

export async function getFirmBranding(firmId: string): Promise<FirmBranding | null> {
  const firmRef = doc(db, 'firms', firmId);
  const firmSnap = await getDoc(firmRef);
  if (firmSnap.exists()) {
    return (firmSnap.data().branding as FirmBranding) || null;
  }
  return null;
}

// ============ INVITE FUNCTIONS ============

export async function createInvite(
  firmId: string,
  firmName: string,
  email: string,
  role: 'admin' | 'member',
  invitedBy: string
): Promise<string> {
  // Check seat limit before creating invite
  const seatCheck = await checkSeatAvailability(firmId);

  if (!seatCheck.canAddMembers) {
    const error = new Error('SEAT_LIMIT_REACHED') as Error & {
      code: string;
      seatInfo: typeof seatCheck;
    };
    error.code = 'SEAT_LIMIT_REACHED';
    error.seatInfo = seatCheck;
    throw error;
  }

  const inviteRef = doc(collection(db, 'firms', firmId, 'invites'));

  // Expire in 7 days
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  await setDoc(inviteRef, {
    email: email.toLowerCase(),
    role,
    invitedBy,
    invitedAt: serverTimestamp(),
    status: 'pending',
    expiresAt,
    firmId,
    firmName,
  });

  return inviteRef.id;
}

export async function getPendingInvitesForUser(email: string): Promise<FirmInvite[]> {
  const firmsRef = collection(db, 'firms');
  const firmsSnap = await getDocs(firmsRef);

  const invites: FirmInvite[] = [];

  for (const firmDoc of firmsSnap.docs) {
    const invitesRef = collection(db, 'firms', firmDoc.id, 'invites');
    const q = query(
      invitesRef,
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'pending')
    );
    const invitesSnap = await getDocs(q);

    invitesSnap.docs.forEach((inviteDoc) => {
      const data = inviteDoc.data();
      // Check if not expired
      if (data.expiresAt.toDate() > new Date()) {
        invites.push({
          id: inviteDoc.id,
          ...data,
        } as FirmInvite);
      }
    });
  }

  return invites;
}

export async function acceptInvite(
  inviteId: string,
  firmId: string,
  userId: string,
  userEmail: string,
  userDisplayName: string
): Promise<void> {
  // Use a transaction to prevent race conditions when multiple users accept invites simultaneously
  await runTransaction(db, async (transaction) => {
    // Read invite first
    const inviteRef = doc(db, 'firms', firmId, 'invites', inviteId);
    const inviteSnap = await transaction.get(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error('Invite not found');
    }

    const inviteData = inviteSnap.data();

    // Check if already accepted
    if (inviteData.status === 'accepted') {
      throw new Error('Invite already accepted');
    }

    // Get current member count within transaction
    const membersRef = collection(db, 'firms', firmId, 'members');
    const membersSnap = await getDocs(membersRef);
    const memberCount = membersSnap.size;

    // Get subscription to check seat limit
    const subRef = doc(db, 'subscriptions', firmId);
    const subSnap = await transaction.get(subRef);

    let seatLimit = 1;
    if (subSnap.exists()) {
      const subscription = subSnap.data();
      if (subscription?.status === 'active') {
        seatLimit = subscription.seats?.total || 1;
      } else {
        // Trial period - allow unlimited
        seatLimit = Infinity;
      }
    } else {
      // No subscription = trial period - allow unlimited
      seatLimit = Infinity;
    }

    if (memberCount >= seatLimit) {
      const error = new Error('SEAT_LIMIT_REACHED') as Error & {
        code: string;
        memberCount: number;
        seatLimit: number;
      };
      error.code = 'SEAT_LIMIT_REACHED';
      error.memberCount = memberCount;
      error.seatLimit = seatLimit;
      throw error;
    }

    // All checks passed - add user as member
    const memberRef = doc(db, 'firms', firmId, 'members', userId);
    transaction.set(memberRef, {
      email: userEmail.toLowerCase(),
      displayName: userDisplayName,
      role: inviteData.role,
      joinedAt: serverTimestamp(),
      invitedBy: inviteData.invitedBy,
    });

    // Update invite status
    transaction.update(inviteRef, { status: 'accepted' });
  });

  // Update user's firmId (outside transaction as it's a different document)
  await updateUserFirmId(userId, firmId);
}

export async function getFirmInvites(firmId: string): Promise<FirmInvite[]> {
  const invitesRef = collection(db, 'firms', firmId, 'invites');
  const q = query(invitesRef, where('status', '==', 'pending'));
  const invitesSnap = await getDocs(q);

  return invitesSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FirmInvite[];
}

export async function deleteInvite(firmId: string, inviteId: string): Promise<void> {
  const inviteRef = doc(db, 'firms', firmId, 'invites', inviteId);
  await deleteDoc(inviteRef);
}

export async function removeMember(firmId: string, userId: string): Promise<void> {
  const memberRef = doc(db, 'firms', firmId, 'members', userId);
  await deleteDoc(memberRef);
  // Clear the user's firmId so they know they've been removed
  await clearUserFirmId(userId);
}

export async function updateMemberRole(
  firmId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<void> {
  const memberRef = doc(db, 'firms', firmId, 'members', userId);
  await updateDoc(memberRef, { role });
}

// ============ REPORT FUNCTIONS ============

function calculateCompletionPercentage(formData: ReportFormData): number {
  const fieldsToCheck = [
    formData.propertyNo,
    formData.block,
    formData.area,
    formData.city,
    formData.originalOwner,
    formData.originalOwnerYear,
    formData.referenceNo,
    formData.valuationDate,
    formData.valuationForDate,
    formData.purpose,
    formData.plotArea > 0,
    formData.landRatePerSqm > 0,
    formData.floorArea > 0,
    formData.yearOfConstruction,
    formData.roof,
    formData.flooring,
    formData.propertyType,
  ];

  const filledFields = fieldsToCheck.filter((field) => {
    if (typeof field === 'boolean') return field;
    if (typeof field === 'number') return field > 0;
    return field && field.toString().trim() !== '';
  }).length;

  return Math.round((filledFields / fieldsToCheck.length) * 100);
}

export async function createReport(
  firmId: string,
  userId: string,
  initialData?: Partial<ReportFormData>
): Promise<string> {
  const reportsRef = collection(db, 'firms', firmId, 'reports');
  const reportRef = doc(reportsRef);
  const reportId = reportRef.id;

  const defaultFormData: ReportFormData = {
    propertyNo: '',
    block: '',
    area: '',
    city: '',
    wardVillageTaluka: '',
    subRegistryBlock: '',
    district: '',
    nearbyLandmark: '',
    landType: '',
    accessApproach: '',
    abutingRoads: '',
    plinthArea: 0,
    carpetArea: 0,
    saleableArea: 0,
    northBoundary: '',
    southBoundary: '',
    eastBoundary: '',
    westBoundary: '',
    northEastBoundary: '',
    northWestBoundary: '',
    southEastBoundary: '',
    southWestBoundary: '',
    originalOwner: '',
    originalOwnerYear: '',
    ownerPhone: '',
    currentOwners: [{ name: '', share: '' }],
    developerName: '',
    referenceNo: '',
    inspectionDate: '',
    valuationDate: '',
    valuationForDate: '',
    purpose: '',
    plotArea: 0,
    landRatePerSqm: 0,
    landRateSource: '',
    locationIncreasePercent: 0,
    landShareFraction: '',
    landShareDecimal: 1,
    floorArea: 0,
    plinthAreaRate: 0,
    costIndex: 100,
    specificationIncreasePercent: 0,
    yearOfConstruction: '',
    estimatedLifeYears: 60,
    ageAtValuation: 0,
    roof: '',
    brickwork: '',
    flooring: '',
    tiles: '',
    electrical: '',
    electricalSwitches: '',
    sanitaryFixtures: '',
    woodwork: '',
    exterior: '',
    floorHeight: '',
    constructionType: '',
    foundationType: '',
    partitions: '',
    roofingTerracing: '',
    architecturalFeatures: '',
    noOfWaterClosets: 0,
    noOfSinks: 0,
    sanitaryFittingsClass: '',
    compoundWallHeight: '',
    compoundWallType: '',
    overheadTank: '',
    noOfPumps: '',
    sewerDisposal: '',
    propertyType: '',
    localityClass: '',
    plotShape: '',
    isLeasehold: false,
    buildingOccupancy: '',
    civicAmenities: [],
    // Legal & Regulatory
    ownershipDocType: '',
    leaseholdRestrictions: '',
    easementAgreement: '',
    acquisitionNotification: '',
    roadWideningNotification: '',
    heritageRestriction: '',
    encumbrances: '',
    buildingPlanSanction: '',
    approvalAuthority: '',
    planViolations: '',
    occupancyCertificateStatus: '',
    unauthorizedConstructions: '',
    farFsiPermitted: '',
    farFsiConsumed: '',
    groundCoverage: '',
    planningZone: '',
    zoningRegulations: '',
    surroundingLandUse: '',
    demolitionProceedings: '',
    sarfaesiCompliant: '',
    // Economic/Rental
    reasonableLettingValue: 0,
    isOccupiedByTenant: false,
    numberOfTenants: 0,
    tenancyDuration: '',
    tenancyStatus: '',
    monthlyRent: 0,
    propertyTaxStatus: '',
    propertyInsurance: '',
    maintenanceCharges: 0,
    securityCharges: 0,
    // Infrastructure
    waterSupply: '',
    sewerageSystem: '',
    stormDrainage: '',
    solidWasteManagement: '',
    electricityStatus: '',
    publicTransportAccess: '',
    nearbySchool: '',
    nearbyMedical: '',
    nearbyRecreation: '',
    // Environmental
    greenBuildingFeatures: '',
    rainWaterHarvesting: '',
    solarProvision: '',
    environmentalPollution: '',
    // Engineering/Safety
    structuralSafety: '',
    earthquakeResistance: '',
    visibleDamage: '',
    airConditioningSystem: '',
    firefightingProvision: '',
    maintenanceIssues: '',
    extentOfDeterioration: '',
    // Architectural
    architecturalStyle: '',
    heritageValue: '',
    landscapeElements: '',
    // Marketability
    locationAttributes: '',
    scarcityValue: '',
    demandSupplyComment: '',
    comparableSalePrices: '',
    lastTwoTransactions: '',
    // Valuation Summary
    guidelineValueLand: 0,
    guidelineValueBuilding: 0,
    marketRateTrend: '',
    forcedSaleValue: 0,
    insuranceValue: 0,
    valuationMethodology: '',
    variationJustification: '',
    // Photos & Location
    locationLat: null,
    locationLng: null,
    locationCapturedAt: '',
    locationMapUrl: '',
    photos: [],
    // Hidden fields tracking
    hiddenFields: [],
    ...initialData,
  };

  const now = serverTimestamp();

  await setDoc(reportRef, {
    metadata: {
      id: reportId,
      title: 'New Report',
      propertyAddress: '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      completionPercentage: 0,
      createdBy: userId,
      lastModifiedBy: userId,
    },
    formData: defaultFormData,
    photoUrls: [],
  });

  return reportId;
}

export async function getReport(firmId: string, reportId: string): Promise<SavedReport | null> {
  const reportRef = doc(db, 'firms', firmId, 'reports', reportId);
  const reportSnap = await getDoc(reportRef);

  if (reportSnap.exists()) {
    const data = reportSnap.data();
    return {
      metadata: {
        ...data.metadata,
        id: reportSnap.id,
        createdAt: data.metadata.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.metadata.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      formData: {
        ...data.formData,
        photos: data.photoUrls || [],
      },
    };
  }
  return null;
}

export async function getAllReports(firmId: string): Promise<SavedReport[]> {
  const reportsRef = collection(db, 'firms', firmId, 'reports');
  const q = query(reportsRef, orderBy('metadata.updatedAt', 'desc'));
  const reportsSnap = await getDocs(q);

  return reportsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      metadata: {
        ...data.metadata,
        id: doc.id,
        createdAt: data.metadata.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.metadata.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      },
      formData: {
        ...data.formData,
        photos: data.photoUrls || [],
      },
    };
  });
}

export async function saveReport(
  firmId: string,
  report: SavedReport,
  userId: string
): Promise<void> {
  const reportRef = doc(db, 'firms', firmId, 'reports', report.metadata.id);

  const completionPercentage = calculateCompletionPercentage(report.formData);

  const propertyAddress = [
    report.formData.propertyNo,
    report.formData.block,
    report.formData.area,
    report.formData.city,
  ]
    .filter(Boolean)
    .join(', ');

  // Separate photos from formData — photos are URLs stored in photoUrls field
  const { photos, ...formDataWithoutPhotos } = report.formData;

  await setDoc(
    reportRef,
    {
      metadata: {
        ...report.metadata,
        propertyAddress,
        completionPercentage,
        updatedAt: serverTimestamp(),
        lastModifiedBy: userId,
      },
      formData: formDataWithoutPhotos,
      photoUrls: photos, // Save photo Storage URLs (small strings, not base64)
    },
    { merge: true }
  );
}

export async function updateReportPhotoUrls(
  firmId: string,
  reportId: string,
  photoUrls: string[]
): Promise<void> {
  const reportRef = doc(db, 'firms', firmId, 'reports', reportId);
  await updateDoc(reportRef, { photoUrls });
}

export async function deleteReport(firmId: string, reportId: string): Promise<void> {
  // Clean up photos from Firebase Storage before deleting the document
  try {
    await deleteReportPhotos(firmId, reportId);
  } catch (e) {
    console.error('Failed to clean up report photos from Storage:', e);
  }

  const reportRef = doc(db, 'firms', firmId, 'reports', reportId);
  await deleteDoc(reportRef);
}

export async function updateReportStatus(
  firmId: string,
  reportId: string,
  status: 'active' | 'concluded'
): Promise<void> {
  const reportRef = doc(db, 'firms', firmId, 'reports', reportId);
  await updateDoc(reportRef, {
    'metadata.status': status,
    'metadata.updatedAt': serverTimestamp(),
  });
}

export async function duplicateReport(
  firmId: string,
  reportId: string,
  userId: string
): Promise<string> {
  const originalReport = await getReport(firmId, reportId);
  if (!originalReport) {
    throw new Error('Report not found');
  }

  // Create new report with same form data but reset metadata
  const newReportId = await createReport(firmId, userId, originalReport.formData);

  return newReportId;
}

export function subscribeToReports(
  firmId: string,
  callback: (reports: SavedReport[]) => void,
  maxReports: number = 50
): () => void {
  const reportsRef = collection(db, 'firms', firmId, 'reports');
  const q = query(reportsRef, orderBy('metadata.updatedAt', 'desc'), limit(maxReports));

  return onSnapshot(q, (snapshot) => {
    const reports = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        metadata: {
          ...data.metadata,
          id: doc.id,
          createdAt: data.metadata.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.metadata.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        },
        formData: {
          ...data.formData,
          photos: data.photoUrls || [],
        },
      };
    });
    callback(reports);
  });
}

// ============ TRIAL FUNCTIONS ============

export async function getTrialByDevice(deviceId: string): Promise<TrialRecord | null> {
  const trialRef = doc(db, 'trials', deviceId);
  const trialSnap = await getDoc(trialRef);

  if (trialSnap.exists()) {
    return trialSnap.data() as TrialRecord;
  }
  return null;
}

export async function createOrUpdateTrialRecord(
  deviceId: string,
  userId: string
): Promise<TrialRecord | null> {
  const trialRef = doc(db, 'trials', deviceId);
  const trialSnap = await getDoc(trialRef);

  if (trialSnap.exists()) {
    const data = trialSnap.data() as TrialRecord;
    // Only add userId if not already present and array isn't at max capacity
    const updates: Record<string, unknown> = { lastUsedAt: serverTimestamp() };
    if (
      !data.linkedGoogleIds?.includes(userId) &&
      (data.linkedGoogleIds?.length || 0) < MAX_DEVICES_PER_ACCOUNT
    ) {
      updates.linkedGoogleIds = arrayUnion(userId);
    }
    await updateDoc(trialRef, updates);
    return data;
  } else {
    // Create new record
    await setDoc(trialRef, {
      deviceFingerprint: deviceId,
      reportsGenerated: 0,
      linkedGoogleIds: [userId],
      createdAt: serverTimestamp(),
      lastUsedAt: serverTimestamp(),
    });
    return null;
  }
}

export async function incrementTrialUsage(
  deviceId: string,
  userId: string
): Promise<{ success: boolean; remaining: number }> {
  const trialRef = doc(db, 'trials', deviceId);
  const userRef = doc(db, 'users', userId);

  // Use transaction to prevent race condition
  return runTransaction(db, async (transaction) => {
    // Read current counts
    const trialSnap = await transaction.get(trialRef);
    const userSnap = await transaction.get(userRef);

    const currentTrialCount = trialSnap.exists() ? (trialSnap.data().reportsGenerated || 0) : 0;
    const currentUserCount = userSnap.exists() ? (userSnap.data().trialReportsUsed || 0) : 0;

    // Check if limit would be exceeded
    const maxCount = Math.max(currentTrialCount, currentUserCount);
    if (maxCount >= TRIAL_LIMIT) {
      return { success: false, remaining: 0 };
    }

    // Increment device trial count
    if (trialSnap.exists()) {
      transaction.update(trialRef, {
        reportsGenerated: increment(1),
        lastUsedAt: serverTimestamp(),
      });
    }

    // Increment user trial count, cap linkedDevices array
    const userUpdates: Record<string, unknown> = { trialReportsUsed: increment(1) };
    const existingDevices = userSnap.exists() ? (userSnap.data().linkedDevices || []) : [];
    if (!existingDevices.includes(deviceId) && existingDevices.length < MAX_DEVICES_PER_ACCOUNT) {
      userUpdates.linkedDevices = arrayUnion(deviceId);
    }
    transaction.update(userRef, userUpdates);

    return { success: true, remaining: TRIAL_LIMIT - maxCount - 1 };
  });
}

export async function getUserTrialCount(userId: string): Promise<number> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data().trialReportsUsed || 0;
  }
  return 0;
}

export async function getFirmTrialCount(firmId: string): Promise<number> {
  const firmRef = doc(db, 'firms', firmId);
  const firmSnap = await getDoc(firmRef);

  if (firmSnap.exists()) {
    return firmSnap.data().trialReportsUsed || 0;
  }
  return 0;
}

export async function incrementFirmTrialUsage(firmId: string): Promise<void> {
  const firmRef = doc(db, 'firms', firmId);
  await updateDoc(firmRef, {
    trialReportsUsed: increment(1),
  });
}

export async function linkDeviceToUser(
  userId: string,
  deviceId: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const data = userSnap.data();
    if (data?.linkedDevices?.includes(deviceId)) return; // Already linked
    if ((data?.linkedDevices?.length || 0) >= MAX_DEVICES_PER_ACCOUNT) return; // At capacity
  }
  await updateDoc(userRef, { linkedDevices: arrayUnion(deviceId) });
}

// ============ SUBSCRIPTION FUNCTIONS ============

export async function getSubscription(firmId: string): Promise<Subscription | null> {
  const subRef = doc(db, 'subscriptions', firmId);
  const subSnap = await getDoc(subRef);

  if (subSnap.exists()) {
    return { firmId, ...subSnap.data() } as Subscription;
  }
  return null;
}

export async function createSubscription(
  firmId: string,
  data: Omit<Subscription, 'firmId' | 'createdAt'>
): Promise<void> {
  const subRef = doc(db, 'subscriptions', firmId);
  await setDoc(subRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateSubscription(
  firmId: string,
  data: Partial<Subscription>
): Promise<void> {
  const subRef = doc(db, 'subscriptions', firmId);
  await updateDoc(subRef, data);
}

export async function cancelSubscription(firmId: string): Promise<void> {
  const subRef = doc(db, 'subscriptions', firmId);
  await updateDoc(subRef, {
    status: 'cancelled',
  });
}

export function subscribeToSubscription(
  firmId: string,
  callback: (subscription: Subscription | null) => void
): () => void {
  const subRef = doc(db, 'subscriptions', firmId);

  return onSnapshot(subRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ firmId, ...snapshot.data() } as Subscription);
    } else {
      callback(null);
    }
  });
}

// ============ SEAT MANAGEMENT FUNCTIONS ============

export interface SeatAvailability {
  memberCount: number;
  pendingInviteCount: number;
  used: number;
  total: number;
  available: number;
  canAddMembers: boolean;
  isTrialPeriod: boolean;
}

export async function checkSeatAvailability(firmId: string): Promise<SeatAvailability> {
  // Get member count
  const membersSnap = await getDocs(collection(db, 'firms', firmId, 'members'));
  const memberCount = membersSnap.size;

  // Get pending invite count
  const invitesRef = collection(db, 'firms', firmId, 'invites');
  const pendingInvitesQuery = query(invitesRef, where('status', '==', 'pending'));
  const pendingInvitesSnap = await getDocs(pendingInvitesQuery);
  // Filter out expired invites
  const now = new Date();
  const pendingInviteCount = pendingInvitesSnap.docs.filter((doc) => {
    const data = doc.data();
    return data.expiresAt?.toDate() > now;
  }).length;

  // Get subscription seat limit
  const subscription = await getSubscription(firmId);

  // During trial (no subscription), allow unlimited members
  // Each member gets their own 5 trial reports
  if (!subscription || subscription.status !== 'active') {
    return {
      memberCount,
      pendingInviteCount,
      used: memberCount + pendingInviteCount,
      total: Infinity,
      available: Infinity,
      canAddMembers: true,
      isTrialPeriod: true,
    };
  }

  const seatLimit = subscription.seats?.total || 1;
  const used = memberCount + pendingInviteCount;
  const available = Math.max(0, seatLimit - used);

  return {
    memberCount,
    pendingInviteCount,
    used,
    total: seatLimit,
    available,
    canAddMembers: available > 0,
    isTrialPeriod: false,
  };
}

export async function getMemberCount(firmId: string): Promise<number> {
  const membersSnap = await getDocs(collection(db, 'firms', firmId, 'members'));
  return membersSnap.size;
}

export async function getPendingInviteCount(firmId: string): Promise<number> {
  const invitesRef = collection(db, 'firms', firmId, 'invites');
  const pendingInvitesQuery = query(invitesRef, where('status', '==', 'pending'));
  const pendingInvitesSnap = await getDocs(pendingInvitesQuery);
  // Filter out expired invites
  const now = new Date();
  return pendingInvitesSnap.docs.filter((doc) => {
    const data = doc.data();
    return data.expiresAt?.toDate() > now;
  }).length;
}
