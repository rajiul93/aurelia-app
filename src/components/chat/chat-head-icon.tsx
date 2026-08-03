import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

type Mood = {
  icon: IoniconName;
  /** How long this mood stays on screen, ms. */
  dwell: number;
  /** Half-period of its idle motion, ms — the pace of its "breathing". */
  period: number;
  /** Idle motion amplitudes. Each mood moves differently on purpose. */
  scale: number;
  rotate: number;
  lift: number;
};

/**
 * The assistant's idle personality loop.
 *
 * Cycling icons alone reads as a broken image swapping; what sells "there's
 * something thinking in here" is that each mood also *moves* differently — the
 * idea twinkles, the invitation bobs, the thought tilts, and sleep breathes
 * slowly. Order and pacing are deliberate: it wakes, offers, ponders, dozes.
 */
const MOODS: Mood[] = [
  // Twinkling — the default "I know things" state.
  { icon: "sparkles", dwell: 3200, period: 900, scale: 0.1, rotate: 0, lift: 0 },
  // Bobbing — an invitation to actually tap it.
  {
    icon: "chatbubble-ellipses",
    dwell: 2600,
    period: 700,
    scale: 0,
    rotate: 0,
    lift: 3,
  },
  // Tilting side to side — pondering.
  { icon: "bulb", dwell: 2400, period: 550, scale: 0.04, rotate: 10, lift: 0 },
  // Slow deep breathing — dozing off until needed.
  { icon: "moon", dwell: 4200, period: 1800, scale: 0.07, rotate: 0, lift: 0 },
];

type ChatHeadIconProps = {
  size: number;
  color: string;
  /** Stops the loop while the panel is open — the head is hidden behind it. */
  paused?: boolean;
};

/**
 * Kept as its own component so the few-seconds mood tick re-renders just the
 * icon. Living inside `FloatingChat` it would re-render the panel and the whole
 * conversation on every change.
 */
export function ChatHeadIcon({ size, color, paused = false }: ChatHeadIconProps) {
  const [index, setIndex] = useState(0);
  const mood = MOODS[index]!;

  // 1 = settled on the current icon, 0 = mid-swap.
  const swap = useSharedValue(1);
  // Oscillates 0..1 forever, driving whatever motion this mood uses.
  const idle = useSharedValue(0);

  useEffect(() => {
    idle.value = 0;
    idle.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: mood.period,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: mood.period,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );
  }, [idle, mood.period]);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = setTimeout(() => {
      const next = (index + 1) % MOODS.length;

      swap.value = withSequence(
        withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (done) => {
          // Swap the glyph while it is invisible, then let the second half of
          // the sequence bring the new one back in.
          if (done) {
            runOnJS(setIndex)(next);
          }
        }),
        withTiming(1, { duration: 280, easing: Easing.out(Easing.back(1.6)) }),
      );
    }, mood.dwell);

    return () => clearTimeout(timer);
  }, [index, mood.dwell, paused, swap]);

  const style = useAnimatedStyle(
    () => ({
      opacity: swap.value,
      transform: [
        // Shrink slightly through the swap, then the `back` easing pops it in.
        { scale: (0.72 + swap.value * 0.28) * (1 + idle.value * mood.scale) },
        { rotate: `${(idle.value - 0.5) * mood.rotate}deg` },
        { translateY: -idle.value * mood.lift },
      ],
    }),
    [mood],
  );

  return (
    <Animated.View style={style}>
      <Ionicons name={mood.icon} size={size} color={color} />
    </Animated.View>
  );
}
