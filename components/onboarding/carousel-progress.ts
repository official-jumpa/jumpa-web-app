"use client";

import { createContext } from "react";

/** Fractional scroll position of the carousel: 0 = first slide, 1.5 = halfway to the third. */
export const CarouselProgressContext = createContext(0);
