import { Platform } from 'react-native';

const Typography = {
  fontFamily: { body: Platform.select({ ios: 'System', android: 'sans-serif', web: 'system-ui' }), editorial: Platform.select({ ios: 'System', android: 'sans-serif', web: 'system-ui' }) },
  fontSize: {
    caption: 12,
    body: 15,
    title: 20,
    heading: 28,
  },
  lineHeight: {
    caption: 18,
    body: 23,
    title: 28,
    heading: 36,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export { Typography };
