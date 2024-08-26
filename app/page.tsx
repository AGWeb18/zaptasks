import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  Calendar,
  UserCheck,
  ThumbsUp,
  CreditCard,
} from "lucide-react";
import LottieWrapper from "./components/LottieWrapper";
import heroAnimation from "./animations/HeroAnimation.json";
import yardworkAnimation from "./animations/YardWork.json";
import handymanAnimation from "./animations/Handyman.json";
import helpinghandAnimation from "./animations/HelpingHands.json";
import paintingAnimation from "./animations/Painting.json";
import bookingAnimation from "./animations/Booking.json";
import techsupportAnimation from "./animations/techsupportAnimation.json";
import petcareAnimation from "./animations/petcareAnimation.json";
import cleaningAnimation from "./animations/cleaningAnimation.json";
import eventassistance from "./animations/eventassistance.json";
import ServicePackages from "./components/Subscriptions";
import BeforeAndAfter from "./components/BeforeAndAfter";

import Navbar from "./components/NavBar";

const services = [
  {
    id: "handyman",
    icon: (
      <LottieWrapper
        animationData={handymanAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Handyman Services",
    description:
      "Assistance with heavy lifting, furniture assembly, and packing or unpacking for moves.",
  },
  {
    id: "help",
    icon: (
      <LottieWrapper
        animationData={helpinghandAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Secondary Set of Hands",
    description:
      "Extra help for various tasks, DIY projects, and minor home repairs.",
  },
  {
    icon: (
      <LottieWrapper
        animationData={paintingAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Paint Help",
    description:
      "Interior and exterior painting, including walls, ceilings, and trim work.",
  },
  {
    icon: (
      <LottieWrapper
        animationData={yardworkAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Yard Work",
    description:
      "Lawn mowing, planting, leaf raking, and basic landscape maintenance.",
  },
  {
    icon: (
      <LottieWrapper
        animationData={cleaningAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Deep Cleaning",
    description:
      "Thorough cleaning of neglected areas, including sanitization and organizing.",
  },
  {
    icon: (
      <LottieWrapper
        animationData={petcareAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Pet Care Assistance",
    description:
      "Dog walking, pet feeding, litter box cleaning, and basic pet care.",
  },
  {
    icon: (
      <LottieWrapper
        animationData={techsupportAnimation}
        width="100%"
        height="100px"
      />
    ),
    name: "Basic Tech Support",
    description:
      "Help with device setup, Wi-Fi troubleshooting, and software installation.",
  },
  {
    icon: (
      <LottieWrapper
        animationData={eventassistance}
        width="100%"
        height="100px"
      />
    ),
    name: "Event Assistance",
    description:
      "Help with setup, cleanup, and guest management for small gatherings and parties.",
  },
];

const steps = [
  {
    icon: <CheckCircle className="w-6 h-6 text-primary" />,
    text: "Choose a service you need",
  },
  {
    icon: <Calendar className="w-6 h-6 text-primary" />,
    text: "Select your preferred date and time",
  },
  {
    icon: <CreditCard className="w-6 h-6 text-primary" />,
    text: "Pay a refundable 50% deposit",
  },
  {
    icon: <UserCheck className="w-6 h-6 text-primary" />,
    text: "Get matched with a skilled professional",
  },
  {
    icon: <ThumbsUp className="w-6 h-6 text-primary" />,
    text: "Enjoy your completed task and pay the remaining balance",
  },
];

const beforeAfterItems = [
  {
    id: "1",
    type: "image" as const,
    before: "/BeforeAndAfter/LivingRoom-Before.jpeg",
    after: "/BeforeAndAfter/LivingRoom-After.jpeg",
  },
  {
    id: "2",
    type: "image" as const,
    before: "/BeforeAndAfter/LivingRoom-Before2.jpeg",
    after: "/BeforeAndAfter/LivingRoom-After2.jpeg",
  },
  {
    id: "3",
    type: "video" as const,
    videoSrc: "/BeforeAndAfter/lawn-care.MP4",
    thumbnail: "/BeforeAndAfter/lawncare-before.png",
  },
  // Add more items as needed
];

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-800">
      <Navbar />
      <main className="container mx-auto px-4 py-12">
        <section className="flex flex-col md:flex-row items-center justify-between mb-16">
          <div className="md:w-1/2 mb-8 md:mb-0 flex flex-col justify-center">
            <h2 className="text-4xl font-bold mb-4">
              Get Help with Your Tasks, Fast!
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Book skilled professionals for various services at your
              fingertips.
            </p>
            <p className="text-xl text-gray-600 mb-8">
              Your local marketplace for on-demand assistance with everyday
              tasks and projects.{" "}
            </p>
            <Link href="/booking">
              <button className="btn btn-lg btn-primary text-white w-full">
                Book a Service Now
              </button>
            </Link>
          </div>
          <div className="md:w-1/2 mb-8 md:mb-0 flex justify-center">
            <LottieWrapper
              animationData={heroAnimation}
              width="100%"
              height="400px"
            />
          </div>
        </section>

        <section id="services" className="mb-16">
          <h3 className="text-2xl font-semibold mb-6 text-center">
            Our Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mx-5">
            {services.map((service, index, description) => (
              <div
                key={index}
                className="text-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-white mb-2">{service.icon}</div>
                <h4 className="font-semibold">{service.name}</h4>
                <p>{service.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="before-and-after" className="mb-16">
          <div>
            <BeforeAndAfter items={beforeAfterItems} />
          </div>
        </section>

        <ServicePackages />

        <section id="how-it-works" className="mb-16">
          <h3 className="text-3xl font-bold mb-8 text-center">How It Works</h3>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 mb-8 md:mb-0 pl-10">
              <ol className="space-y-6">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex items-center justify-center rounded-full w-10 h-10 mr-4 flex-shrink-0">
                      {step.icon}
                    </span>
                    <div>
                      <p className="font-semibold">{`Step ${index + 1}`}</p>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <LottieWrapper
                animationData={bookingAnimation}
                width="100%"
                height="400px"
              />
            </div>
          </div>

          <div className="mt-8 bg-gray-100 p-6 rounded-lg">
            <h4 className="text-xl font-semibold mb-2">Payment Structure</h4>
            <p>At ZapTasks, we ensure a fair and secure transaction process:</p>
            <ul className="list-disc list-inside mt-2">
              <li>
                You pay a refundable 50% deposit upfront when booking a service.
              </li>
              <li>
                The remaining 50% is paid after the task is successfully
                completed.
              </li>
              <li>
                This structure protects both you and our service providers,
                ensuring quality work and timely payments.
              </li>
            </ul>
          </div>
        </section>

        <section id="contact" className="text-center">
          <h3 className="text-2xl font-semibold mb-6">Ready to Get Started?</h3>
          <p className="text-xl text-gray-600 mb-8">
            Experience the convenience of ZapTasks today!
          </p>
          <Link href={"/booking"}>
            <button className="btn btn-primary btn-lg text-white">
              Start Now
            </button>
          </Link>
        </section>
      </main>

      <footer className="bg-gray-100 mt-16">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-gray-600">
            &copy; 2024 ZapTasks. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
