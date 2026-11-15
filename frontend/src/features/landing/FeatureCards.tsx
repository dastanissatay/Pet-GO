import { Card } from "@/components/Card";
import { Chip } from "@/components/Chip";

const FEATURES = [
  {
    tag: "Forecast",
    title: "Know the year before it happens",
    text: "A cost range for your pet's breed, age, size and ZIP code, by category.",
    tone: "mint",
  },
  {
    tag: "Decode",
    title: "Is this vet bill normal?",
    text: "Paste an estimate. Every line is checked against US prices, with questions to ask your vet.",
    tone: "lilac",
  },
  {
    tag: "Grow",
    title: "Small habits, smaller bills",
    text: "Daily care quests level up your pet's avatar and help prevent costly visits.",
    tone: "sun",
  },
] as const;

export function FeatureCards() {
  return (
    <section id="how" className="container flex scroll-mt-6 flex-col gap-8 pb-10 pt-20">
      <h2 className="text-[36px] leading-tight sm:text-[48px]">One app for every pet bill</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {FEATURES.map((feature) => (
          <Card
            key={feature.tag}
            as="article"
            variant="raised"
            tone={feature.tone}
            className="flex flex-col gap-3"
          >
            <Chip tone="surface" className="self-start">
              {feature.tag}
            </Chip>
            <h3 className="text-[26px] leading-tight">{feature.title}</h3>
            <p className="text-base leading-normal">{feature.text}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
