import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

interface BrainWaveAnimationProps {
    isActive: boolean;
    size?: number;
}

export function BrainWaveAnimation({ isActive, size = 200 }: BrainWaveAnimationProps) {
    const waves = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];

    useEffect(() => {
        let animations: Animated.CompositeAnimation[] = [];

        if (isActive) {
            const animateWave = (animValue: Animated.Value, delay: number) => {
                const createLoop = () => {
                    const animation = Animated.loop(
                        Animated.timing(animValue, {
                            toValue: 1,
                            duration: 3000,
                            delay,
                            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
                            useNativeDriver: true,
                        }),
                        { resetBeforeIteration: true },
                    );

                    animations.push(animation);
                    animation.start();
                };
                createLoop();
            };

            // Delays menores para ondas mais fluidas
            animateWave(waves[0], 0);
            animateWave(waves[1], 300);
            animateWave(waves[2], 600);
            animateWave(waves[3], 900);
        }

        return () => {
            animations.forEach((animation) => animation.stop());
        };
    }, [isActive, ...waves]);

    const createWaveStyle = (animValue: Animated.Value, scale: number) => ({
        position: 'absolute' as const,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5, 
        borderColor: '#0ea5e9',
        transform: [
            {
                scale: animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, scale], 
                }),
            },
        ],
        opacity: animValue.interpolate({
            inputRange: [0, 0.3, 0.7, 1],
            outputRange: [0, 0.8, 0.3, 0], 
        }),
    });

    return (
        <View
            style={{
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Animated.View style={createWaveStyle(waves[0], 1.2)} />
            <Animated.View style={createWaveStyle(waves[1], 1.4)} />
            <Animated.View style={createWaveStyle(waves[2], 1.6)} />
            <Animated.View style={createWaveStyle(waves[3], 1.8)} />
        </View>
    );
}
