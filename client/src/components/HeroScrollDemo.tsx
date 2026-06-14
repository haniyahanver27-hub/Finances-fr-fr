import { ArrowUpRight, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const portfolioStats = [
  { icon: TrendingUp, label: "Clan return", value: "+12.8%" },
  { icon: Users, label: "Active voters", value: "8 / 10" },
  { icon: ShieldCheck, label: "Risk score", value: "Balanced" },
];

export function HeroScrollDemo() {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-[#fffefc] text-[#163b24]">
      <ContainerScroll
        titleComponent={
          <div className="mx-auto max-w-3xl px-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#058236]">
              Learn together. Trade smarter.
            </p>
            <h2 className="text-4xl font-black tracking-tight text-[#163b24] md:text-6xl">
              Turn market moves into{" "}
              <span className="text-[#47a666]">team decisions.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-[#41624c] md:text-lg">
              Explore a paper portfolio, debate each trade, and build investing
              confidence without putting real money on the line.
            </p>
          </div>
        }
      >
        <div className="relative h-full w-full bg-[#c9f9d9]">
          <img
            src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1800&q=85"
            alt="Market charts on a trading desk"
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#072b16]/95 via-[#072b16]/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c9f9d9]">
                  Demo Alpha Clan
                </p>
                <h3 className="mt-1 text-2xl font-black md:text-4xl">
                  $112,840 virtual value
                </h3>
              </div>
              <ArrowUpRight className="hidden text-[#c9f9d9] md:block" size={36} />
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {portfolioStats.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-md md:p-4"
                >
                  <Icon className="mb-2 text-[#c9f9d9]" size={20} />
                  <p className="text-[0.65rem] text-white/70 md:text-xs">{label}</p>
                  <strong className="text-sm md:text-lg">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ContainerScroll>
    </div>
  );
}
