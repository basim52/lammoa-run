// المهمات بالترتيب: كل وحدة مكان ونوع لعب وكلام مختلف
export const MISSIONS = [
  { id: 1, key: 'm1', icon: '🐱', title: 'قطو الشاهي', loc: 'souq', type: 'chase', creature: 'cat', goal: 'الحق القطو قبل يخلص الوقت ورجّع براد الشاهي', T: 60, gap: 38, close: 0.85, hitPen: 6, speed: 13 },
  { id: 2, key: 'm2', icon: '🐑', title: 'الخروف الزعلان', loc: 'desert', type: 'escape', creature: 'sheep', goal: 'اهرب من الخروف ٤٥ ثانية ولا تخليه يمسك لمّوعة', T: 45, speed: 13.5 },
  { id: 3, key: 'm3', icon: '🛵', title: 'طلب مستعجل', loc: 'city', type: 'delivery', goal: 'وصّل البرجر ٨٠٠ متر بالسكوتر قبل يبرد. كل صدمة تنقص ٤ ثواني', T: 60, D: 800, speed: 19, vehicle: true },
  { id: 4, key: 'm4', icon: '👮', title: 'حارس المول', loc: 'mall', type: 'stealth', creature: 'guard', goal: 'إذا طلعت علامة ❗ اسحب لتحت وانزل قبل يلتفت. ٣ مرات يشوفك = خسارة', T: 50, speed: 11 },
  { id: 5, key: 'm5', icon: '🚌', title: 'الحق الباص', loc: 'city', type: 'chase', creature: 'bus', goal: 'الباص بيمشي! الحقه قبل يخلص الوقت', T: 50, gap: 34, close: 1.0, hitPen: 5, speed: 15 },
  { id: 6, key: 'm6', icon: '☕', title: 'طلبات الكوفي', loc: 'cafe', type: 'orders', goal: 'اجمع ٨ أكواب بلون الطلب المطلوب. ٣ غلطات = خسارة', T: 80, N: 8, speed: 12 },
  { id: 7, key: 'm7', icon: '🕊️', title: 'هروب السطوح', loc: 'rooftop', type: 'escape', creature: 'pigeons', gaps: true, goal: 'نط فوق الفراغات بين السطوح واهرب من الحمام ٤٥ ثانية', T: 45, speed: 14 },
  { id: 8, key: 'm8', icon: '🫖', title: 'الشاهي الكبير', loc: 'night', type: 'chase', creature: 'cat', gang: true, goal: 'القطو ومعه أصحابه! الحقهم بالسوق بالليل وأنقذ الشاهي', T: 70, gap: 48, close: 0.9, hitPen: 7, speed: 16 },
];
export const ENDLESS = { id: 99, key: 'endless', icon: '♾️', title: 'تحدي بلا نهاية', loc: 'city', type: 'endless', goal: 'اركض أبعد مسافة، الأماكن والملاحقين يتغيرون كل شوي', speed: 14 };
