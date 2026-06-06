// PROTOTYPE — throwaway mock data for UI exploration
// Fake trail: a loop around Angel Island, San Francisco Bay

export const route = [
  [37.8635, -122.4328], [37.8640, -122.4310], [37.8648, -122.4295],
  [37.8660, -122.4275], [37.8672, -122.4260], [37.8680, -122.4240],
  [37.8685, -122.4215], [37.8682, -122.4190], [37.8675, -122.4170],
  [37.8665, -122.4155], [37.8650, -122.4145], [37.8635, -122.4140],
  [37.8620, -122.4145], [37.8608, -122.4160], [37.8600, -122.4180],
  [37.8595, -122.4200], [37.8598, -122.4225], [37.8605, -122.4250],
  [37.8615, -122.4275], [37.8625, -122.4300], [37.8635, -122.4328],
];

// Gap between points 9 and 10 (signal loss in the trees)
export const gaps = [{ from: 9, to: 10 }];

export const photos = [
  {
    id: 'p1',
    position: [37.8648, -122.4295],
    thumbnail: 'https://picsum.photos/seed/trail1/200/200',
    full: 'https://picsum.photos/seed/trail1/1600/1200',
    time: '9:15 AM',
    caption: 'Morning light on the bay',
  },
  {
    id: 'p2',
    position: [37.8680, -122.4240],
    thumbnail: 'https://picsum.photos/seed/trail2/200/200',
    full: 'https://picsum.photos/seed/trail2/1600/1200',
    time: '9:42 AM',
    caption: 'Wildflowers along the ridge',
  },
  {
    id: 'p3',
    position: [37.8682, -122.4190],
    thumbnail: 'https://picsum.photos/seed/trail3/200/200',
    full: 'https://picsum.photos/seed/trail3/1600/1200',
    time: '10:05 AM',
    caption: 'View of the Golden Gate',
  },
  {
    id: 'p4',
    position: [37.8683, -122.4188],
    thumbnail: 'https://picsum.photos/seed/trail4/200/200',
    full: 'https://picsum.photos/seed/trail4/1600/1200',
    time: '10:05 AM',
    caption: 'Golden Gate close-up',
    clusteredWith: 'p3',
  },
  {
    id: 'p5',
    position: [37.8620, -122.4145],
    thumbnail: 'https://picsum.photos/seed/trail5/200/200',
    full: 'https://picsum.photos/seed/trail5/1600/1200',
    time: '10:30 AM',
    caption: 'Deer on the path',
  },
  {
    id: 'p6',
    position: [37.8600, -122.4180],
    thumbnail: 'https://picsum.photos/seed/trail6/200/200',
    full: 'https://picsum.photos/seed/trail6/1600/1200',
    time: '10:55 AM',
    caption: 'Looking back at the trailhead',
  },
];

// Pre-clustered: p3 and p4 form a cluster
export const clusters = [
  { id: 'c1', photos: ['p3', 'p4'], hero: 'p3', position: [37.8682, -122.4190] },
];

export const activity = {
  name: 'Angel Island Loop',
  date: 'March 15, 2025',
  distance: '5.2 mi',
  duration: '2h 15m',
  elevation: '820 ft',
};
