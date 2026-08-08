import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type CurrentTimeLineProps = {
  date: Date;
  hourHeight: number;
  topOffset?: number;
  leftOffset?: number;
  rightOffset?: number;
  showDot?: boolean;
};

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export default function CurrentTimeLine({
  date,
  hourHeight,
  topOffset = 0,
  leftOffset = 0,
  rightOffset = 0,
  showDot = true,
}: CurrentTimeLineProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const update = () => setNow(new Date());

    update();

    const intervalId = setInterval(update, 30_000);

    return () => clearInterval(intervalId);
  }, []);

  const visible = useMemo(() => isSameDay(date, now), [date, now]);

  if (!visible) return null;

  const top = topOffset + (minutesSinceMidnight(now) / 60) * hourHeight;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          top,
          left: leftOffset,
          right: rightOffset,
        },
      ]}
    >
      {showDot && <View style={styles.dot} />}
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    height: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
    marginLeft: -4,
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: '#ff3b30',
  },
});
