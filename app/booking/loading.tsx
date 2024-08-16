import LottieWrapper from "../components/LottieWrapper";
import suspenseAnimation from "../animations/suspense.json";

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <LottieWrapper
      animationData={suspenseAnimation}
      width="100%"
      height="400px"
    />
  );
}
