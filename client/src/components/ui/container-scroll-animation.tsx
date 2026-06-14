import React, { useRef } from "react";
import {
  motion,
  type MotionValue,
  useScroll,
  useTransform,
} from "framer-motion";

type ContainerScrollProps = {
  titleComponent: React.ReactNode;
  children: React.ReactNode;
};

export const ContainerScroll = ({
  titleComponent,
  children,
}: ContainerScrollProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    isMobile ? [0.72, 0.92] : [1.05, 1],
  );
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <section
      className="relative flex h-[52rem] items-center justify-center p-2 md:h-[72rem] md:p-16"
      ref={containerRef}
    >
      <div
        className="relative w-full py-10 md:py-36"
        style={{ perspective: "1000px" }}
      >
        <Header translate={translate}>{titleComponent}</Header>
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </section>
  );
};

const Header = ({
  translate,
  children,
}: {
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div
    style={{ translateY: translate }}
    className="mx-auto max-w-5xl text-center"
  >
    {children}
  </motion.div>
);

const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      boxShadow:
        "0 9px 20px #05823624, 0 37px 37px #0582361f, 0 84px 50px #05823614, 0 149px 60px #0582360a",
    }}
    className="mx-auto -mt-10 h-[28rem] w-full max-w-5xl rounded-[30px] border-4 border-[#47a666] bg-[#058236] p-2 shadow-2xl md:h-[40rem] md:p-5"
  >
    <div className="h-full w-full overflow-hidden rounded-2xl bg-[#fffefc]">
      {children}
    </div>
  </motion.div>
);
