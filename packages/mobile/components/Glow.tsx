import { StyleSheet, View } from "react-native";

/** Soft radial glow faked with stacked translucent circles (no gradient lib needed). */
export function Glow({
  color,
  size,
  style,
}: {
  color: string;
  size: number;
  style?: object;
}) {
  const layers = [1, 0.78, 0.58, 0.4, 0.24];
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, styles.abs, style]}>
      {layers.map((s, i) => (
        <View
          key={s}
          style={{
            position: "absolute",
            width: size * s,
            height: size * s,
            left: (size - size * s) / 2,
            top: (size - size * s) / 2,
            borderRadius: size,
            backgroundColor: color,
            opacity: 0.07 + i * 0.015,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ abs: { position: "absolute" } });
