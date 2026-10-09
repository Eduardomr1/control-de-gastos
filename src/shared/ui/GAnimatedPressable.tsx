import React from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

export interface GAnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTarget?: number;
  damping?: number;
  stiffness?: number;
}

/**
 * Primitivo interactivo con micro-animación de física elástica.
 * Reacciona al contacto del usuario escalando suavemente a 0.96 (o scaleTarget)
 * con un resorte natural de 60-120 FPS en el hilo nativo de UI.
 */
export const GAnimatedPressable: React.FC<GAnimatedPressableProps> = ({
  children,
  style,
  scaleTarget = 0.96,
  damping = 15,
  stiffness = 300,
  disabled,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(scaleTarget, { damping, stiffness });
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(1, { damping, stiffness });
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableBase
      style={[style, animatedStyle]}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      {children}
    </AnimatedPressableBase>
  );
};
