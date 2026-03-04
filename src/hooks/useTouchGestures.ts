import React, { useRef, useState } from 'react';

interface TouchGesturesProps {
    zoom: number;
    setZoom: (val: number | ((prev: number) => number)) => void;
    nextPage: () => void;
    prevPage: () => void;
    toggleControls: () => void;
}

export function useTouchGestures({
    zoom,
    setZoom,
    nextPage,
    prevPage,
    toggleControls
}: TouchGesturesProps) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const lastTapRef = useRef(0);

    const touchState = useRef({
        initialDistance: 0,
        initialZoom: 1,
        initialOffset: { x: 0, y: 0 },
        lastTouch: { x: 0, y: 0 },
        startX: 0,
        startY: 0,
        isPinching: false,
        isPanning: false
    });

    const handleTouchStart = (e: React.TouchEvent) => {
        const now = Date.now();
        if (now - lastTapRef.current < 300 && e.touches.length === 1) {
            // Double tap detected
            setZoom(1);
            setOffset({ x: 0, y: 0 });
            return;
        }
        lastTapRef.current = now;

        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

            touchState.current = {
                ...touchState.current,
                initialDistance: distance,
                initialZoom: zoom,
                isPinching: true,
                isPanning: false
            };
        } else if (e.touches.length === 1) {
            touchState.current = {
                ...touchState.current,
                lastTouch: { x: e.touches[0].clientX, y: e.touches[0].clientY },
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                initialOffset: { ...offset },
                isPanning: zoom > 1,
                isPinching: false
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && touchState.current.isPinching) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];

            const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
            const zoomDelta = distance / touchState.current.initialDistance;

            setZoom(Math.min(Math.max(touchState.current.initialZoom * zoomDelta, 0.5), 5));
        } else if (e.touches.length === 1 && touchState.current.isPanning) {
            const deltaX = e.touches[0].clientX - touchState.current.lastTouch.x;
            const deltaY = e.touches[0].clientY - touchState.current.lastTouch.y;

            setOffset({
                x: touchState.current.initialOffset.x + deltaX,
                y: touchState.current.initialOffset.y + deltaY
            });
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchState.current.isPinching && !touchState.current.isPanning && zoom === 1) {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const deltaX = endX - touchState.current.startX;
            const deltaY = endY - touchState.current.startY;

            if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100) {
                if (deltaX > 0) {
                    prevPage();
                } else {
                    nextPage();
                }
            } else if (Math.abs(deltaY) > 50 && Math.abs(deltaX) < 100) {
                if (deltaY > 0) {
                    prevPage();
                } else {
                    nextPage();
                }
            } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
                toggleControls();
            }
        }
        touchState.current.isPinching = false;
        touchState.current.isPanning = false;
    };

    return {
        offset,
        setOffset,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    };
}
