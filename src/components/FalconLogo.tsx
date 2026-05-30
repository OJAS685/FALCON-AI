import React from 'react';

interface FalconLogoProps {
  className?: string;
  fillColor?: string;
}

export default function FalconLogo({ className = "w-8 h-8", fillColor = "currentColor" }: FalconLogoProps) {
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={`${className} transition-transform duration-300`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background container or grouping to render high-contrast Falcon 'F' Logo */}
      <g>
        {/* UPPER WING & HEAD OF THE FALCON with native transparent eye cutout */}
        <path
          d="M 215 456 
             C 215 430, 240 395, 290 375 
             C 350 350, 460 325, 580 300 
             C 700 275, 790 235, 836 215 
             C 830 250, 760 340, 660 380 
             C 560 420, 440 480, 370 545
             C 365 520, 345 480, 310 470
             C 275 460, 240 458, 215 456 Z
             M 285 410 
             L 345 392 
             L 310 415 
             Z"
          fill={fillColor}
          fillRule="evenodd"
        />

        {/* MIDDLE SWEEPING FEATHER (forms the middle bar of 'F') */}
        <path
          d="M 408 626 
             C 412 560, 480 500, 580 455 
             C 660 420, 725 395, 765 380 
             C 745 410, 680 470, 580 515 
             C 490 555, 430 595, 408 626 Z"
          fill={fillColor}
        />

        {/* BOTTOM STREAK / TAIL PLUME (forms the stem base of 'F') */}
        <path
          d="M 580 560 
             C 525 610, 455 680, 440 785 
             C 442 710, 485 640, 580 560 Z"
          fill={fillColor}
        />
      </g>
    </svg>
  );
}
