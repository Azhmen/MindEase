import type { WellbeingResource } from '@/services/resources';
export function filterResources(resources: WellbeingResource[], category: string, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return resources.filter(item => (category === 'All' || item.category === category)
    && [item.title, item.description, item.category, item.summary ?? ''].join(' ').toLocaleLowerCase().includes(query));
}
