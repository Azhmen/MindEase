import { FeatureBanner, IllustratedEmptyState, SectionHeader } from '@/components/wellness-ui';
import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/text';
import { AppTextInput } from '@/components/app-text-input';
import { Colors } from '@/constants/colors';
import { CareIcon } from '@/components/care-icon';
import { CareButton, StudentCard, studentStyles } from '@/components/student-ui';
import { LoadingState, StudentScreen, StatusMessage } from '@/components/student-screen';
import { gihaniStyles as styles, useGihaniAction } from '@/components/gihani-ui';
import { RESOURCE_CATEGORIES, STARTER_RESOURCES } from '@/constants/starter-resources';
import { getResource, getResources, type WellbeingResource } from '@/services/resources';
import { getSavedResources, removeSavedResource, saveResource, setSavedResourceFavorite, updateSavedResourcePersonalNote, type SavedResource } from '@/services/saved-resources';
import { filterResources } from '@/utils/resource-search';
import { getAuthErrorMessage } from '@/utils/auth';
import { requireUserId } from '@/services/student-session';
import { logSavedResourceError } from '@/utils/saved-resource-errors';

function ResourceHeading({ resource }: { resource: WellbeingResource }) {
  return <><View style={studentStyles.row}><View style={resourceStyles.icon}><CareIcon name="book" size={22} color={resourceColors.primary} /></View><View style={studentStyles.flex}><AppText style={resourceStyles.title}>{resource.title}</AppText><AppText style={resourceStyles.metadata}>{[resource.category, resource.duration, resource.type].filter(Boolean).join(' \u2022 ')}</AppText></View></View><AppText style={[styles.text, { color: resourceColors.secondary }]}>{resource.description}</AppText></>;
}

function ResourceSaveButton({ saved, title, disabled, onPress }: { saved: boolean; title: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [resourceStyles.saveButton, saved && resourceStyles.savedButton, disabled && !saved && { opacity: 0.5 }, pressed && !disabled && { opacity: 0.85 }]}>
    {saved ? <CareIcon name="check" size={18} color={resourceColors.primary} /> : null}
    <AppText style={[resourceStyles.saveText, saved && { color: Colors.careGreen }]}>{title}</AppText>
  </Pressable>;
}

const resourceColors = { page: Colors.careBackground, card: Colors.carePale, icon: '#BFDDCD', badge: '#C4E2D2', primary: '#0F5132', secondary: '#64756D' } as const;

const resourceStyles = StyleSheet.create({
  card: { backgroundColor: resourceColors.card, padding: 18, borderRadius: 22, gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: resourceColors.icon, alignItems: 'center', justifyContent: 'center' },
  title: { color: resourceColors.primary, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  metadata: { color: resourceColors.secondary, fontSize: 12, lineHeight: 18 },
  chip: { backgroundColor: Colors.carePale, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  selectedChip: { backgroundColor: Colors.careGreen },
  chipText: { color: Colors.careGreen, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  selectedChipText: { color: Colors.onPrimary },
  saveButton: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: Colors.careGreen, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', gap: 6 },
  savedButton: { backgroundColor: Colors.carePale },
  saveText: { color: Colors.onPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' },
});
export function ResourcesScreen() {
  const router = useRouter();
  const [resources, setResources] = useState<WellbeingResource[]>([]);
  const [saved, setSaved] = useState<SavedResource[]>([]);
  const [source, setSource] = useState<'firestore' | 'starter'>('firestore');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const action = useGihaniAction();
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError('');
    Promise.all([getResources(), getSavedResources()]).then(([library, savedItems]) => { if (active) { setResources(library.resources); setSource(library.source); setSaved(savedItems); } }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  const categories = ['All', ...new Set<string>([...RESOURCE_CATEGORIES, ...resources.map(item => item.category)])];
  const visible = filterResources(resources, category, search);
  const featured = visible.filter(item => item.featured).slice(0, 3);
  const highlights = featured.length ? featured : visible.slice(0, 2);
  return <StudentScreen backgroundColor={resourceColors.page} headingStyle={{ color: resourceColors.primary }} title="Self-Help Resources" eyebrow="SMALL MOMENTS OF CARE">
    <FeatureBanner title="A little support for your day" description="Explore short practices at your own pace. General wellbeing guidance only; reach out to trusted or campus support when you need more help." icon="leaf" tone="mint" />
    <CareButton title="View Saved Resources" secondary onPress={() => router.push('/student/resources/saved')} />
    <AppTextInput label="Search resources" placeholder="Search topics, practices or support..." value={search} onChangeText={setSearch} style={{ backgroundColor: Colors.surface }} />
    <StatusMessage message={error || action.error} error /><StatusMessage message={action.notice} />
    {loading ? <LoadingState /> : null}
    {error ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error ? <>
      <AppText style={[styles.label, { color: resourceColors.primary }]}>{source === 'starter' ? 'Original starter wellbeing library' : 'Wellbeing library'}</AppText>
      <View style={styles.wrap}>{categories.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: category === item }} onPress={() => setCategory(item)} style={[resourceStyles.chip, category === item && resourceStyles.selectedChip]}><AppText style={[resourceStyles.chipText, category === item && resourceStyles.selectedChipText]}>{item}</AppText></Pressable>)}</View>
      {highlights.length ? <View style={styles.group}><SectionHeader title="Featured Resources" subtitle="A few gentle starting points for your day." />{highlights.map(resource => <StudentCard key={resource.id} style={resourceStyles.card}><View style={{ alignSelf: 'flex-start', backgroundColor: resourceColors.badge, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}><AppText style={{ color: resourceColors.primary, fontSize: 12, lineHeight: 18, fontWeight: '600', textTransform: 'capitalize' }}>FEATURED PRACTICE</AppText></View><ResourceHeading resource={resource} /><CareButton title="Explore Resource" secondary compact onPress={() => router.push({ pathname: '/student/resources/[id]', params: { id: resource.id } })} /></StudentCard>)}</View> : null}
      <AppText style={[studentStyles.section, { color: resourceColors.primary }]}>Browse Resources · {visible.length}</AppText>
      {!visible.length ? <IllustratedEmptyState title="No resources here yet" description="Try another search or category, or check back later." icon="book" /> : null}
      {visible.map(resource => {
        const isSaved = saved.some(item => item.resourceId === resource.id);
        return <StudentCard key={resource.id} style={resourceStyles.card}><ResourceHeading resource={resource} /><View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><CareButton title="Open Resource" secondary compact onPress={() => router.push({ pathname: '/student/resources/[id]', params: { id: resource.id } })} /><ResourceSaveButton saved={isSaved} title={isSaved ? 'Saved' : action.busy ? 'Saving...' : 'Save'} disabled={isSaved || action.busy} onPress={() => action.run(async () => { const id = await saveResource(resource.id); setSaved(items => [...items.filter(item => item.resourceId !== resource.id), { id, userId: requireUserId(), resourceId: resource.id, personalNote: '', favorite: false, savedAt: null, updatedAt: null }]); }, 'Resource saved.')} /></View></StudentCard>;
      })}
    </> : null}
  </StudentScreen>;
}
function SavedResourceCard({ saved, resource, resourceError, onChanged, onRemoved }: { saved: SavedResource; resource: WellbeingResource | null; resourceError?: string; onChanged: (changes: Partial<Pick<SavedResource, 'personalNote' | 'favorite'>>) => void; onRemoved: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const action = useGihaniAction();
  // The parent saved document is the display source; text is only an edit draft.
  const personalNote = saved.personalNote.trim();
  return <StudentCard style={resourceStyles.card}>
    {resource ? <ResourceHeading resource={resource} /> : <><AppText style={[studentStyles.section, { color: resourceColors.primary }]}>Resource unavailable</AppText><AppText style={[styles.text, { color: resourceColors.secondary }]}>This resource was removed or deactivated. Your favorite and personal note are still available.</AppText></>}
    <View style={studentStyles.row}><CareIcon name={saved.favorite ? "heart" : "book"} size={16} /><AppText style={[styles.label, { color: resourceColors.primary }]}>{saved.favorite ? 'Favorite' : 'Saved resource'}</AppText></View>
    <StatusMessage message={action.error || resourceError || ''} error /><StatusMessage message={action.notice} />
    {resource ? <CareButton title="Open / View" secondary compact disabled={action.busy} onPress={() => router.push({ pathname: '/student/resources/[id]', params: { id: resource.id } })} /> : null}
    <CareButton title={saved.favorite ? 'Remove Favorite' : 'Add to Favorites'} secondary compact disabled={action.busy} onPress={() => action.run(async () => { const favorite = !saved.favorite; await setSavedResourceFavorite(saved.id, favorite); onChanged({ favorite }); }, 'Favorite updated.')} />
    {editing ? <View style={styles.group}><AppTextInput label="Your personal note" value={text} onChangeText={setText} multiline maxLength={1000} editable={!action.busy} style={styles.editor} /><AppText style={[styles.text, { color: resourceColors.secondary }]}>{text.length}/1000 characters · Leave blank to clear</AppText><CareButton title={action.busy ? 'Saving...' : 'Save Note'} disabled={action.busy} onPress={() => action.run(async () => { const personalNote = text.trim(); await updateSavedResourcePersonalNote(saved.id, personalNote); onChanged({ personalNote }); setEditing(false); }, 'Personal note saved.')} /><CareButton title="Cancel Edit" secondary disabled={action.busy} onPress={() => setEditing(false)} /></View> : <><View style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: Colors.careBorder, gap: 4 }}><AppText style={[styles.label, { color: resourceColors.primary }]}>Personal note</AppText><AppText style={[styles.text, { color: resourceColors.secondary }]}>{personalNote || 'No personal note yet.'}</AppText></View><CareButton title={personalNote ? 'Edit Note' : 'Add Note'} secondary compact disabled={action.busy} onPress={() => { setText(personalNote); setEditing(true); }} /></>}
    <CareButton danger compact title={action.busy ? 'Removing...' : 'Remove from Saved'} secondary disabled={action.busy} onPress={() => action.run(async () => { await removeSavedResource(saved.resourceId); onRemoved(); })} />
  </StudentCard>;
}
export function SavedResourcesScreen() {
  const [notice, setNotice] = useState('');
  const router = useRouter();
  const [items, setItems] = useState<{ saved: SavedResource; resource: WellbeingResource | null; resourceError?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError(''); setNotice('');
    getSavedResources().then(saved => Promise.all(saved.map(async item => {
      try { return { saved: item, resource: await getResource(item.resourceId) }; }
      catch (err) {
        logSavedResourceError('Unable to load resource details for ' + item.resourceId, err);
        // Catalog failures must not disable removal of the student's own saved record.
        return { saved: item, resource: STARTER_RESOURCES.find(resource => resource.id === item.resourceId) ?? null, resourceError: 'Resource details could not be refreshed. ' + getAuthErrorMessage(err) };
      }
    }))).then(value => { if (active) setItems(value); }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]));
  return <StudentScreen backgroundColor={resourceColors.page} headingStyle={{ color: resourceColors.primary }} title="Saved Resources" eyebrow="YOUR PERSONAL COLLECTION">
    <AppText style={[styles.text, { color: resourceColors.secondary }]}>Return to helpful practices and notice what works for you.</AppText>
    <CareButton title="Browse Resources" secondary onPress={() => router.push('/student/resources')} />
    {loading ? <LoadingState /> : null}<StatusMessage message={error} error /><StatusMessage key={items.length} message={notice} />
    {error ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error && !items.length ? <IllustratedEmptyState title="No saved resources yet" description="Save a practice from the library to find it here." icon="book" /> : null}
    {!loading && !error ? items.map(item => <SavedResourceCard key={item.saved.id} {...item} onChanged={changes => setItems(values => values.map(value => value.saved.id === item.saved.id ? { ...value, saved: { ...value.saved, ...changes } } : value))} onRemoved={() => { setItems(values => values.filter(value => value.saved.resourceId !== item.saved.resourceId)); setNotice('Resource removed.'); }} />) : null}
  </StudentScreen>;
}
export function ResourceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [resource, setResource] = useState<WellbeingResource | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const action = useGihaniAction();
  useFocusEffect(useCallback(() => {
    void attempt;
    let active = true; setLoading(true); setError(''); setResource(null); setSaved(false);
    if (!id) { setError('This resource link is missing its ID.'); setLoading(false); return; }
    Promise.all([getResource(id), getSavedResources()]).then(([entry, collection]) => { if (active) { setResource(entry); setSaved(collection.some(item => item.resourceId === id)); } }).catch(err => { if (active) setError(getAuthErrorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]));
  return <StudentScreen backgroundColor={resourceColors.page} headingStyle={{ color: resourceColors.primary }} title="A Moment for You">
    {loading ? <LoadingState /> : null}<StatusMessage message={error || action.error} error /><StatusMessage message={action.notice} />
    {error ? <CareButton title="Try again" secondary onPress={() => setAttempt(value => value + 1)} /> : null}
    {!loading && !error ? resource ? <><StudentCard style={resourceStyles.card}><ResourceHeading resource={resource} /></StudentCard><StudentCard style={resourceStyles.card}><AppText style={[studentStyles.section, { color: resourceColors.primary }]}>Try this at your own pace</AppText><AppText style={[styles.text, { color: resourceColors.secondary }]}>{resource.summary || resource.description}</AppText></StudentCard><AppText style={[styles.text, { color: resourceColors.secondary }]}>General wellbeing guidance only. Stop any practice that feels uncomfortable and seek trusted support when needed.</AppText><ResourceSaveButton saved={saved} title={saved ? 'Saved' : action.busy ? 'Saving...' : 'Save Resource'} disabled={saved || action.busy} onPress={() => action.run(async () => { await saveResource(id); setSaved(true); }, 'Resource saved.')} /></> : <StudentCard style={resourceStyles.card}><AppText style={[studentStyles.section, { color: resourceColors.primary }]}>Resource unavailable</AppText><AppText style={[styles.text, { color: resourceColors.secondary }]}>This resource is no longer available.</AppText></StudentCard> : null}
    <CareButton title="View Saved Resources" secondary onPress={() => router.push('/student/resources/saved')} />
    <CareButton title="Back to Resources" secondary onPress={() => router.replace('/student/resources')} />
  </StudentScreen>;
}
