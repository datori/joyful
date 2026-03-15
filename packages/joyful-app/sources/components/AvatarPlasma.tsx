import * as React from "react";
import { Platform, View } from "react-native";
import { Canvas, Circle, Group, Rect, BlurMask, Skia, Paint, RadialGradient, vec } from "@shopify/react-native-skia";

function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// Simple LCG seeded PRNG for deterministic generation from a hash seed
function seededRandom(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(1664525, s) + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

interface AvatarPlasmaProps {
    id: string;
    square?: boolean;
    size?: number;
    monochrome?: boolean;
}

function computePlasmaData(id: string, size: number, monochrome: boolean) {
    const hash = hashCode(id);
    const rng = seededRandom(hash);

    const hue1 = hash % 360;
    const hue2 = (hue1 + 110 + Math.floor(rng() * 40)) % 360;
    const hue3 = (hue1 + 220 + Math.floor(rng() * 40)) % 360;
    const hues = [hue1, hue2, hue3];

    // Distribute blobs ~120° apart so they always occupy distinct regions.
    // A random base angle (from hash) rotates the whole triangle, giving each
    // ID a different orientation while guaranteeing spatial separation.
    const baseAngle = rng() * Math.PI * 2;

    const blobs = hues.map((hue, i) => {
        // Each blob starts at baseAngle + i*120°, then nudged ±15° for variety
        const angle = baseAngle + (i * Math.PI * 2) / 3 + (rng() - 0.5) * 0.5;
        const dist = size * (0.22 + rng() * 0.12);
        const r = size * (0.36 + rng() * 0.10);
        return {
            cx: size / 2 + Math.cos(angle) * dist,
            cy: size / 2 + Math.sin(angle) * dist,
            r,
            color: monochrome
                ? `hsl(0, 0%, ${28 + Math.floor(rng() * 40)}%)`
                : `hsl(${hue}, 88%, 60%)`,
        };
    });

    const backgroundColor = monochrome ? 'hsl(0, 0%, 7%)' : `hsl(${hue1}, 22%, 8%)`;
    // Slightly lighter/more saturated version of the background for the centre glow
    const centerGlowColor = monochrome ? 'hsl(0, 0%, 50%)' : `hsl(${hue1}, 65%, 62%)`;

    return { blobs, backgroundColor, centerGlowColor };
}

const BLUR = 0.28; // sigma as fraction of size — soft but not totally diffuse

// Web: pure CSS implementation — Skia/CanvasKit loads async on web so we can't
// mount any Canvas component until it's ready. CSS filter+mix-blend-mode gives
// the same plasma look without any Skia dependency.
function AvatarPlasmaWeb(props: AvatarPlasmaProps) {
    const { id, size = 48, square = false, monochrome = false } = props;
    const { blobs, backgroundColor, centerGlowColor } = React.useMemo(
        () => computePlasmaData(id, size, monochrome),
        [id, size, monochrome],
    );

    const blurPx = size * BLUR;
    const borderRadius = square ? 0 : size / 2;

    return (
        <View style={{
            width: size, height: size, borderRadius, overflow: 'hidden',
            background: `radial-gradient(circle at 50% 50%, ${centerGlowColor} 0%, ${backgroundColor} 80%)`,
            boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.28)`,
        } as any}>
            {blobs.map((blob, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: blob.r * 2,
                        height: blob.r * 2,
                        borderRadius: blob.r,
                        left: blob.cx - blob.r,
                        top: blob.cy - blob.r,
                        backgroundColor: blob.color,
                        filter: `blur(${blurPx}px)`,
                        mixBlendMode: 'screen',
                    } as any}
                />
            ))}
        </View>
    );
}

// Native: Skia implementation — CanvasKit is always sync-ready on native.
function AvatarPlasmaSkia(props: AvatarPlasmaProps) {
    const { id, size = 48, square = false, monochrome = false } = props;
    const { blobs, backgroundColor, centerGlowColor } = React.useMemo(
        () => computePlasmaData(id, size, monochrome),
        [id, size, monochrome],
    );

    const clipPath = React.useMemo(() => {
        const path = Skia.Path.Make();
        if (square) {
            path.addRect(Skia.XYWHRect(0, 0, size, size));
        } else {
            path.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, size, size), size / 2, size / 2));
        }
        return path;
    }, [size, square]);

    const blurSigma = size * BLUR;

    return (
        <Canvas style={{ width: size, height: size }}>
            <Group clip={clipPath}>
                <Rect x={0} y={0} width={size} height={size}>
                    <RadialGradient
                        c={vec(size / 2, size / 2)}
                        r={size * 0.8}
                        colors={[centerGlowColor, backgroundColor]}
                    />
                </Rect>
                {blobs.map((blob, i) => (
                    <Group key={i} blendMode="screen">
                        <Circle cx={blob.cx} cy={blob.cy} r={blob.r} color={blob.color}>
                            <BlurMask blur={blurSigma} style="normal" />
                        </Circle>
                    </Group>
                ))}
                {/* Inset ring: stroke circle just inside the clip boundary */}
                {!square && (
                    <Circle cx={size / 2} cy={size / 2} r={size / 2 - 1}>
                        <Paint style="stroke" strokeWidth={1.5} color="rgba(255,255,255,0.28)" />
                    </Circle>
                )}
            </Group>
        </Canvas>
    );
}

export const AvatarPlasma = React.memo(
    Platform.OS === 'web' ? AvatarPlasmaWeb : AvatarPlasmaSkia
);
