import {
  IconAward,
  IconArrowBackUp,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconBarbell,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconFeather,
  IconFlame,
  IconHanger,
  IconLayoutGrid,
  IconLeaf,
  IconLuggage,
  IconMountain,
  IconRuler,
  IconRun,
  IconShieldCheck,
  IconShirt,
  IconShoe,
  IconSnowflake,
  IconSun,
  IconTent,
  IconTrendingUp,
  IconUmbrella,
  IconWind,
} from "@tabler/icons-react";
import type { Perk, PerkIconKey } from "@/lib/productDetail";

/**
 * The icon key → glyph table. Kept here rather than in lib/productDetail so
 * that module stays plain data with no dependency on the icon package.
 */
const ICONS: Record<PerkIconKey, React.ComponentType<{ className?: string }>> = {
  feather: IconFeather,
  leaf: IconLeaf,
  wind: IconWind,
  snowflake: IconSnowflake,
  flame: IconFlame,
  sun: IconSun,
  run: IconRun,
  mountain: IconMountain,
  tent: IconTent,
  barbell: IconBarbell,
  briefcase: IconBriefcase,
  hanger: IconHanger,
  shirt: IconShirt,
  award: IconAward,
  trending: IconTrendingUp,
  ruler: IconRuler,
  minimize: IconArrowsMinimize,
  maximize: IconArrowsMaximize,
  building: IconBuildingSkyscraper,
  umbrella: IconUmbrella,
  luggage: IconLuggage,
  grid: IconLayoutGrid,
  shoe: IconShoe,
  shield: IconShieldCheck,
  return: IconArrowBackUp,
};

/**
 * Stacked rather than in a three-across row: this sits in the detail column
 * beside the photo now, and three columns inside that width would leave each
 * perk about ten characters wide.
 */
export function ProductPerks({ perks }: { perks: Perk[] }) {
  return (
    <ul className="mt-6 space-y-4 border-t border-border pt-6">
      {perks.map((perk) => {
        const Icon = ICONS[perk.icon];
        return (
          <li key={perk.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{perk.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {perk.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
