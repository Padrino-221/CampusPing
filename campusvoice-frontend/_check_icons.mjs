import * as p from './node_modules/@phosphor-icons/react/dist/index.es.js';
const keys = Object.keys(p);
const check = ['Warning', 'Triangle', 'Coins', 'ChatCircle', 'ChatDots', 'CaretDown', 'CaretUp', 'SpinnerGap', 'Dots', 'Clipboard', 'BuildingApartment', 'Student', 'ChalkboardTeacher', 'ChatTeardrop'];
for (const s of check) {
  const exact = keys.filter(k => k === s);
  const starts = keys.filter(k => k.startsWith(s));
  console.log(s, '->', exact.length ? exact : (starts.length ? starts.slice(0,4) : 'NOT FOUND'));
}
