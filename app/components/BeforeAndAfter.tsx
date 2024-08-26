"use client";

import React, { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Image from "next/image";

interface BeforeAfterItem {
  id: string;
  type: "image" | "video";
  before?: string;
  after?: string;
  videoSrc?: string;
  thumbnail?: string;
}

interface BeforeAndAfterProps {
  items: BeforeAfterItem[];
}

const BeforeAndAfter: React.FC<BeforeAndAfterProps> = ({ items }) => {
  const [showAfter, setShowAfter] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    console.log("isPlaying changed:", isPlaying);
  }, [isPlaying]);

  const handleSlideChange = () => {
    setShowAfter(false);
    setIsPlaying(false);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold text-center text-gray-900 mb-12">
        Before and After
      </h1>
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={50}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        loop={true}
        className="mySwiper"
        onSlideChange={handleSlideChange}
      >
        {items.map((item) => (
          <SwiperSlide key={item.id}>
            <div className="relative w-full aspect-video">
              {item.type === "image" ? (
                <Image
                  src={showAfter ? item.after! : item.before!}
                  alt={showAfter ? "After" : "Before"}
                  layout="fill"
                  objectFit="cover"
                />
              ) : (
                <>
                  {isPlaying ? (
                    <div className="relative w-full h-full">
                      <video
                        muted
                        controls
                        autoPlay
                        src={item.videoSrc}
                        onError={(e) => console.error("Video error:", e)}
                        className="absolute inset-0 w-full h-full object-cover"
                      >
                        <source src={item.videoSrc} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  ) : (
                    <Image
                      src={item.thumbnail!}
                      alt="Video Thumbnail"
                      layout="fill"
                      objectFit="cover"
                    />
                  )}
                </>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  className="px-4 py-2 bg-white text-black rounded-full shadow-md hover:bg-gray-200 transition-colors duration-200"
                  onClick={() => {
                    if (item.type === "video") {
                      console.log(
                        "Video button clicked, current isPlaying:",
                        isPlaying
                      );
                      setIsPlaying(!isPlaying);
                    } else {
                      setShowAfter(!showAfter);
                    }
                  }}
                >
                  {item.type === "image"
                    ? showAfter
                      ? "Show Before"
                      : "Show After"
                    : isPlaying
                    ? "Show Thumbnail"
                    : "Play Video"}
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BeforeAndAfter;
