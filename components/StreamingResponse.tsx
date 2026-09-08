import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Text, View } from "react-native";

const C = {
  surface: "#0B1020",
  border: "#202B49",
  primary2: "#A18CFF",
  text: "#FFFFFF",
  muted: "#98A3BF",
};

type Props = {
  text: string;
  streaming?: boolean;
  speed?: number;
  onText?: (visible: string) => void;
};

/** ChatGPT-style local streaming presentation.
 * Feed it the complete server response and it reveals the text progressively.
 * When the Edge Function is changed to emit chunks, the parent can instead
 * update `text` incrementally and set `streaming` to true.
 */
export default function StreamingResponse({ text, streaming = false, speed = 14, onText }: Props) {
  const cursor = useRef(new Animated.Value(1)).current;
  const visible = useMemo(() => text ?? "", [text]);
  const [shown, setShown] = React.useState(streaming ? "" : visible);

  useEffect(() => {
    if (!streaming) {
      setShown(visible);
      onText?.(visible);
      return;
    }
    let cancelled = false;
    let index = 0;
    setShown("");
    const tick = () => {
      if (cancelled) return;
      index += 1;
      const next = visible.slice(0, index);
      setShown(next);
      onText?.(next);
      if (index < visible.length) setTimeout(tick, speed);
    };
    const timer = setTimeout(tick, speed);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, streaming, speed, onText]);

  useEffect(() => {
    if (!streaming) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cursor, { toValue: 0, duration: 480, useNativeDriver: true }),
        Animated.timing(cursor, { toValue: 1, duration: 480, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [streaming, cursor]);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", flexShrink: 1 }}>
      <View style={{ flexShrink: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11 }}>
        <Text style={{ color: C.text, fontSize: 15, lineHeight: 22 }}>{shown}</Text>
        {streaming && (
          <Animated.Text style={{ color: C.primary2, fontSize: 16, fontWeight: "900", opacity: cursor, marginLeft: 1 }}>▌</Animated.Text>
        )}
      </View>
      {streaming && <Text style={{ color: C.muted, fontSize: 10, marginLeft: 7, marginBottom: 4 }}>Generating</Text>}
    </View>
  );
}
