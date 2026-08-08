// Shared pinch-gesture thresholds used by DayGrid and MonthlyGrid.
// Normal pinch: advances one step in the view hierarchy (Monthly, Weekly, Daily).
// Large pinch: skips Weekly entirely.
export const PINCH_IN_THRESHOLD = 1.15;
export const PINCH_OUT_THRESHOLD = 0.85;
export const LARGE_PINCH_IN_THRESHOLD = 5;
export const LARGE_PINCH_OUT_THRESHOLD = 0.2;

// Once a large pinch fires its haptic, it won't fire again until
// the fingers go back to neutral (between LOW and HIGH)
export const PINCH_RESET_HIGH = 1.05;
export const PINCH_RESET_LOW = 0.95;
