"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const LottieComponent = dynamic(() => import('lottie-react'), { ssr: false });

interface LottieWrapperProps {
  animationData: any;
  width?: number | string;
  height?: number | string;
}

const LottieWrapper: React.FC<LottieWrapperProps> = ({ animationData, width = 400, height = 400 }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // You can return a placeholder or null here
    return <div style={{ width, height }}></div>;
  }

  return (
    <LottieComponent
      animationData={animationData}      
      style={{ width, height }}
      loop={true}
    />
  );
};

export default LottieWrapper;