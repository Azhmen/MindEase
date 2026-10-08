export const studentGuide = [
  { title: 'Mood Check-in', description: 'Choose how you feel and add an optional note. Save your check-in to revisit later.' },
  { title: 'Mood History', description: 'Review previous check-ins and add a reflection about how you feel looking back.' },
  { title: 'Live Chat', description: 'Open Live Support, select an available counselor and send text messages. Chat is not an emergency response service.' },
  { title: 'Booking an Appointment', description: 'Choose a counselor, published time and session format. Review your choices before confirming.' },
  { title: 'Pre-session Notes', description: 'Optionally share what you would like support with. You can edit or remove your note from your appointment.' },
  { title: 'Self-Help Resources', description: 'Search wellbeing resources, save useful items and add your own personal notes or favorites.' },
  { title: 'Anonymous Mode', description: 'Continue Anonymously from Login to use a separate session without giving your name, email or student ID.' },
  { title: 'Crisis Support', description: 'Open Crisis Support for urgent support information. Contact appropriate local emergency support if there is immediate danger.' },
];
export const studentFaq = [
  { title: 'Can I use MindEase anonymously?', description: 'Yes. Anonymous mode does not collect your name, email or student ID. A system-generated anonymous Firebase UID is used only to securely isolate your session data.' },
  { title: 'Can counselors see all my information?', description: 'Counselors can access conversations and appointments assigned to them, including linked pre-session notes. They do not have general access to your private mood entries, reflections or saved resources.' },
  { title: 'Can I cancel an appointment?', description: 'Yes. Open My Appointments and choose Cancel. The appointment remains recorded with a cancelled status.' },
  { title: 'Is MindEase a replacement for professional care?', description: 'No. MindEase supports access and wellbeing guidance but does not replace professional care.' },
  { title: 'Where can I get urgent help?', description: 'Open Crisis Support for immediate support options. Contact trusted campus or local emergency support when you need urgent help.' },
];
export const studentSupportOptions = [
  { id: 'crisis', title: 'Crisis Support', category: 'Urgent Help', icon: 'shield', description: 'Immediate help and urgent support information.', route: '/student/crisis-support' },
  { id: 'resources', title: 'Counseling Resources', category: 'Wellbeing', icon: 'leaf', description: 'Browse wellbeing and counseling resources.', route: '/student/resources' },
  { id: 'technical', title: 'Technical Support', category: 'Account Access', icon: 'lock', description: 'Help with login, access, or app issues.', detail: 'Contact your university IT/help desk. Use an approved university channel and never share your password. Contact details have not been configured here.' },
  { id: 'guide', title: 'Platform Guide', category: 'Getting Started', icon: 'book', description: 'Learn how to use MindEase features.' },
  { id: 'admin', title: 'Contact Admin', category: 'Campus Support', icon: 'chat', description: 'Contact campus support or administration.', detail: 'Contact information can be configured by your institution. Use your university’s approved campus support or administration channel.' },
  { id: 'faq', title: 'FAQ', category: 'Getting Started', icon: 'portal', description: 'Common questions about MindEase.' },
] as const;
export function filterStudentSupport(search: string, category = '') {
  const query = search.trim().toLowerCase();
  return studentSupportOptions.filter(option => (!category || option.category === category) && [option.title, option.description, option.category].join(' ').toLowerCase().includes(query));
}
