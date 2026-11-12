const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: 'false' };

export const FlashIcon = ({ on }) => (
	<svg {...base} fill={on ? 'currentColor' : 'none'}>
		<path d="M13 2 4.5 13.5H12L11 22l8.5-11.5H12L13 2Z" />
	</svg>
);

export const CheckIcon = () => (
	<svg {...base}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);

export const InfoIcon = () => (
	<svg {...base}><circle cx="12" cy="12" r="9.5" /><path d="M12 11v5.5M12 7.5h.01" /></svg>
);

export const BellIcon = () => (
	<svg {...base} width={20} height={20}><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" /><path d="M10 20a2.2 2.2 0 0 0 4 0" /></svg>
);

export const CalendarIcon = () => (
	<svg {...base} width={56} height={56} strokeWidth={1.5}><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);

// ---------- Panel de la directora ----------
const tile = { ...base, width: 28, height: 28, strokeWidth: 1.8 };
const small = { ...base, width: 20, height: 20 };

export const StudentsIcon = () => (
	<svg {...tile}><path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z" /><path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11M21.5 9v5" /></svg>
);

export const TutorsIcon = () => (
	<svg {...tile}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" /><circle cx="17" cy="9.5" r="2.5" /><path d="M17 14.5c2.5 0 4.5 2 4.5 4.5" /></svg>
);

export const QrIcon = () => (
	<svg {...tile}><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" /><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" /><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5h1M20.5 14v1.5" /></svg>
);

export const ChecklistIcon = () => (
	<svg {...tile}><rect x="4" y="3.5" width="16" height="17" rx="2.5" /><path d="m7.5 9 1.5 1.5 3-3M7.5 15l1.5 1.5 3-3M14.5 9.5h2.5M14.5 15.5h2.5" /></svg>
);

export const ClockIcon = () => (
	<svg {...tile}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);

export const KeyIcon = () => (
	<svg {...tile}><circle cx="8" cy="15" r="4.5" /><path d="m11.5 11.5 8-8M16.5 6.5l2.5 2.5M14 9l2 2" /></svg>
);

export const ScanIcon = () => (
	<svg {...tile}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M4 12h16" /></svg>
);

export const BackIcon = () => (
	<svg {...small}><path d="M15 5 8 12l7 7" /></svg>
);

export const PlusIcon = () => (
	<svg {...small}><path d="M12 5v14M5 12h14" /></svg>
);

export const DownloadIcon = () => (
	<svg {...small}><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14" /></svg>
);

export const CameraIcon = () => (
	<svg {...small}><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9Z" /><circle cx="12" cy="13" r="3.5" /></svg>
);

export const ChevronIcon = () => (
	<svg {...small}><path d="m9 5 7 7-7 7" /></svg>
);

export const RefreshIcon = () => (
	<svg {...small}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5" /></svg>
);

export const MenuIcon = () => (
	<svg {...base}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

export const CloseIcon = () => (
	<svg {...base}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const HomeIcon = () => (
	<svg {...tile}><path d="M3.5 11 12 4l8.5 7" /><path d="M6 9.5V19a1.5 1.5 0 0 0 1.5 1.5h3V15h3v5.5h3A1.5 1.5 0 0 0 18 19V9.5" /></svg>
);

export const LogoutIcon = () => (
	<svg {...small}><path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16l-4-4 4-4M6 12h9" /></svg>
);
