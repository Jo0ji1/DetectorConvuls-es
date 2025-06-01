import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

interface PulseAnimationProps {
    children: React.ReactNode;
    duration?: number;
    minScale?: number;
    maxScale?: number;
    isActive?: boolean;
}

export function PulseAnimation({
    children,
    duration = 2000,
    minScale = 0.95,
    maxScale = 1.05,
    isActive = true,
}: PulseAnimationProps) {
    const scaleValue = useRef(new Animated.Value(minScale)).current;

    useEffect(() => {
        if (isActive) {
            const pulse = () => {
                Animated.sequence([
                    Animated.timing(scaleValue, {
                        toValue: maxScale,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleValue, {
                        toValue: minScale,
                        duration: duration / 2,
                        useNativeDriver: true,
                    }),
                ]).start(() => pulse());
            };
            pulse();
        }

        return () => {
            scaleValue.stopAnimation();
        };
    }, [isActive, duration, minScale, maxScale, scaleValue]);

    return (
        <Animated.View
            style={{
                transform: [{ scale: scaleValue }],
            }}
        >
            {children}
        </Animated.View>
    );
}
