'use client';

import { RefObject, useLayoutEffect } from 'react';

export const useAutoResizeTextarea = (ref: RefObject<HTMLTextAreaElement>, value: string) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.style.height = '0px';
    const nextHeight = Math.min(element.scrollHeight, 320);
    element.style.height = `${nextHeight}px`;
  }, [ref, value]);
};
