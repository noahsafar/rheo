// A made-up Slack workspace for the synthetic Marsh Lab, so the demo can show the Slack connection
// without a real workspace. Like everything else in the demo, the people and messages are invented.

export const SLACK_CHANNELS = [
  { id: 'marsh-lab', name: '#marsh-lab', about: 'Whole lab: announcements, scheduling, questions', invention: null },
  { id: 'hydrogel', name: '#hydrogel', about: 'siRNA hydrogel project', invention: 'inv1' },
  { id: 'sweat-patch', name: '#sweat-patch', about: 'Sweat lactate patch project', invention: 'inv2' },
  { id: 'random', name: '#random', about: 'Off-topic', invention: null },
];

// Messages Rheo can read once a channel is connected. Ones about results, methods or ideas carry an
// invention and a confidence, and become suggested records for a person to confirm.
export const SLACK_MESSAGES = [
  { id: 'slk-1', channel: 'hydrogel', owner: 'm2', date: '2026-10-27', time: '16:12', text: 'Day 21 release on batch 14 is in: 62% cumulative, still linear. Plotting now.', invention: 'inv1', confidence: 0.82 },
  { id: 'slk-2', channel: 'hydrogel', owner: 'm6', date: '2026-10-23', time: '10:40', text: 'RiboGreen standards look good today, R² 0.995. Plate reader gain is behaving again.', invention: 'inv1', confidence: 0.74 },
  { id: 'slk-3', channel: 'hydrogel', owner: 'm1', date: '2026-10-21', time: '18:05', text: 'Knockdown at day 14 is ~55%. What if we pre-complex at N/P 12 and load after gelation? Worth one batch.', invention: 'inv1', confidence: 0.79 },
  { id: 'slk-4', channel: 'hydrogel', owner: 'm2', date: '2026-10-13', time: '14:30', text: 'N/P 15 was a bust, polyplexes crashed out and the gel went cloudy. Going back to N/P 10.', invention: 'inv1', confidence: 0.71 },
  { id: 'slk-5', channel: 'sweat-patch', owner: 'm4', date: '2026-10-28', time: '11:02', text: 'New adhesive held 3 h on the forearm, lifted at one edge during the ride. Better than the old tape.', invention: 'inv2', confidence: 0.8 },
  { id: 'slk-6', channel: 'sweat-patch', owner: 'm8', date: '2026-10-26', time: '15:47', text: 'Batch 9 paper sensors done, 40 of 40 pass. Spray-coated enzyme is way more even.', invention: 'inv2', confidence: 0.77 },
  { id: 'slk-7', channel: 'sweat-patch', owner: 'm8', date: '2026-10-25', time: '09:15', text: 'Drafting the abstract for the spring biosensors conference, due Feb 1. Can someone send me the v7 channel figure?', invention: 'inv2', confidence: 0.68 },
  { id: 'slk-8', channel: 'sweat-patch', owner: 'm4', date: '2026-10-15', time: '17:20', text: 'Plasma bonding PET to PDMS delaminated after 10 min in buffer. Sticking with double-sided adhesive.', invention: 'inv2', confidence: 0.73 },
  { id: 'slk-9', channel: 'marsh-lab', owner: 'm1', date: '2026-10-27', time: '08:30', text: 'Reminder: lab meeting Thursday, I am presenting the disclosure plan. Slides by Wednesday please.', invention: null },
  { id: 'slk-10', channel: 'marsh-lab', owner: 'm6', date: '2026-10-24', time: '12:00', text: 'Liquid nitrogen delivery moved to Monday this week.', invention: null },
  { id: 'slk-11', channel: 'marsh-lab', owner: 'm2', date: '2026-10-22', time: '16:45', text: 'Heads up: I am leaving Dec 15. I will write handoff notes for the gel synthesis before then.', invention: null },
  { id: 'slk-12', channel: 'random', owner: 'm4', date: '2026-10-23', time: '13:10', text: 'Who left a cake in the break room? Asking for a friend.', invention: null },
];
