import { doc, getDoc, runTransaction, serverTimestamp, type Timestamp } from 'firebase/firestore';

import { auth, db } from '@/config/firebase';

export type UserRole = 'student' | 'counselor';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Timestamp;
  title?: string;
  specialization?: string;
  bio?: string;
  officeLocation?: string;
  phoneExtension?: string;
  updatedAt?: Timestamp;
  appointmentRemindersEnabled?: boolean;
  faculty?: string;
  yearOfStudy?: string;
  preferredName?: string;
}

export interface StudentProfileInput { name: string; faculty?: string; yearOfStudy?: string; preferredName?: string }
export const STUDENT_PROFILE_LIMITS = { name: 100, faculty: 120, yearOfStudy: 1, preferredName: 100 } as const;
export function validateStudentProfile(input: StudentProfileInput): Required<StudentProfileInput> {
  const fields = {} as Required<StudentProfileInput>;
  for (const key of Object.keys(STUDENT_PROFILE_LIMITS) as (keyof StudentProfileInput)[]) {
    const value = input[key] ?? '';
    if (typeof value !== 'string') throw new Error('Profile fields must contain text.');
    fields[key] = value.trim();
    if (fields[key].length > STUDENT_PROFILE_LIMITS[key]) throw new Error('Check the length of your ' + key + '.');
  }
  if (!fields.name) throw new Error('Enter your full name.');
  if (fields.yearOfStudy && !/^[1-8]$/.test(fields.yearOfStudy)) throw new Error('Enter a year of study from 1 to 8, or leave it blank.');
  return fields;
}
export async function updateCurrentStudentProfile(input: StudentProfileInput, expectedUid: string): Promise<Required<StudentProfileInput>> {
  const user = auth.currentUser, fields = validateStudentProfile(input);
  if (!user || user.isAnonymous || user.uid !== expectedUid) throw new Error('Your account changed. Please reopen Profile.');
  await runTransaction(db, async tx => {
    const ref = doc(db, 'users', user.uid), profile = await tx.get(ref);
    if (!profile.exists() || profile.data().role !== 'student') throw new Error('Please sign in with a student account.');
    if (auth.currentUser?.uid !== user.uid) throw new Error('Your account changed. Please reopen Profile.');
    tx.update(ref, { ...fields, updatedAt: serverTimestamp() });
  });
  return fields;
}

export type CreateUserProfileInput = Pick<UserProfile, 'uid' | 'name' | 'email' | 'role'>;

export interface CounselorProfileInput {
  name: string;
  title?: string;
  specialization?: string;
  bio?: string;
  officeLocation?: string;
  phoneExtension?: string;
}
export const COUNSELOR_PROFILE_LIMITS = { name: 100, title: 100, specialization: 160, officeLocation: 200, bio: 1000, phoneExtension: 30 } as const;

function counselorAuthUid() {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Please sign in with a counselor account.');
  return user.uid;
}
function assertCounselorAuth(uid: string) {
  if (counselorAuthUid() !== uid) throw new Error('Your account changed. Please reopen Profile.');
}
export function validateCounselorProfile(input: CounselorProfileInput): Required<CounselorProfileInput> {
  const fields = {} as Required<CounselorProfileInput>;
  for (const key of Object.keys(COUNSELOR_PROFILE_LIMITS) as (keyof CounselorProfileInput)[]) {
    const value = input[key] ?? '';
    if (typeof value !== 'string') throw new Error('Profile fields must contain text.');
    fields[key] = value.trim();
    if (fields[key].length > COUNSELOR_PROFILE_LIMITS[key]) throw new Error('Keep ' + key + ' within ' + COUNSELOR_PROFILE_LIMITS[key] + ' characters.');
  }
  if (!fields.name) throw new Error('Enter your name.');
  return fields;
}

export async function getCurrentCounselorProfile(): Promise<UserProfile> {
  const uid = counselorAuthUid();
  const profile = await getUserProfile(uid);
  assertCounselorAuth(uid);
  if (!profile || profile.role !== 'counselor') throw new Error('Your counselor profile could not be loaded.');
  return profile;
}

export async function updateCurrentCounselorProfile(input: CounselorProfileInput, expectedUid?: string): Promise<Required<CounselorProfileInput>> {
  const uid = counselorAuthUid(), fields = validateCounselorProfile(input);
  if (expectedUid && expectedUid !== uid) throw new Error('Your account changed. Please reopen Profile.');
  const privateRef = doc(db, 'users', uid), publicRef = doc(db, 'counselor_directory', uid);
  await runTransaction(db, async tx => {
    const profile = await tx.get(privateRef), directory = await tx.get(publicRef);
    if (!profile.exists() || profile.data().role !== 'counselor') throw new Error('Please sign in with a counselor account.');
    // Directory membership/active status remains administered; never self-provision it.
    if (!directory.exists()) throw new Error('Your counselor directory entry is missing. Ask your campus administrator to configure it before saving.');
    assertCounselorAuth(uid);
    tx.update(privateRef, { ...fields, updatedAt: serverTimestamp() });
    tx.update(publicRef, { name: fields.name, title: fields.title, specialization: fields.specialization });
  });
  assertCounselorAuth(uid);
  return fields;
}

// Call after registration with the UID returned in credential.user.uid.
// This creates the profile at users/{uid}; use a separate update helper for edits.
export async function createUserProfile(profile: CreateUserProfileInput): Promise<void> {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== profile.uid) throw new Error('Your account changed. Please sign in again.');
  const name = profile.name.trim(), email = profile.email.trim();
  if (!name || name.length > 100 || !['student', 'counselor'].includes(profile.role)) throw new Error('Enter a valid name and select Student or Counselor.');
  if (email !== user.email) throw new Error('Your profile email must match your signed-in account.');
  await runTransaction(db, async tx => {
    const ref = doc(db, 'users', user.uid), existing = await tx.get(ref);
    if (auth.currentUser?.uid !== user.uid) throw new Error('Your account changed. Please sign in again.');
    // Retry after an uncertain write must not overwrite identity, settings or createdAt.
    if (existing.exists()) {
      if (existing.data().uid !== user.uid || existing.data().email !== email || existing.data().role !== profile.role) throw new Error('An existing profile does not match this registration. Please contact support.');
      return;
    }
    tx.set(ref, { uid: user.uid, name, email, role: profile.role, createdAt: serverTimestamp(), appointmentRemindersEnabled: false });
  });
}

// Returns null when the user has not created a profile yet.
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid));

  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

// Settings-only write: never update registration identity or counselor directory data.
export async function setAppointmentRemindersEnabled(enabled: boolean, expectedUid: string): Promise<void> {
  if (typeof enabled !== 'boolean') throw new Error('Choose an enabled or disabled reminder preference.');
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== expectedUid) throw new Error('Your account changed. Please reopen Profile.');
  await runTransaction(db, async tx => {
    const ref = doc(db, 'users', user.uid), profile = await tx.get(ref);
    if (!profile.exists() || profile.data().role !== 'student') throw new Error('Please sign in with a student account.');
    if (auth.currentUser?.uid !== user.uid) throw new Error('Your account changed. Please reopen Profile.');
    tx.update(ref, { appointmentRemindersEnabled: enabled, updatedAt: serverTimestamp() });
  });
}
