import type { DayThemeId } from "@/lib/day-themes";

export type CuratedPlanTime = "MORNING" | "AFTERNOON" | "EVENING";
export type CuratedPlanEntityType = "ATTRACTION" | "RESTAURANT" | "SHOW" | "EXPERIENCE";

export type CuratedPlanItem = {
  title: string;
  timing: CuratedPlanTime;
  entityType: CuratedPlanEntityType;
  matchNames?: string[];
  note?: string;
};

export type CuratedDayPlan = {
  id: string;
  park: Extract<DayThemeId, "mk" | "epcot" | "hs" | "ak">;
  title: string;
  bestFor: string;
  pace: string;
  description: string;
  items: CuratedPlanItem[];
};

const breakItem = (title: string, timing: CuratedPlanTime, note: string): CuratedPlanItem => ({
  title,
  timing,
  entityType: "EXPERIENCE",
  note,
});

export const CURATED_DAY_PLANS: CuratedDayPlan[] = [
  {
    id: "mk-first-visit",
    park: "mk",
    title: "The first-visit favorites",
    bestFor: "First visits",
    pace: "Full day",
    description: "Castle classics, a few headliners, a cool-down, and fireworks.",
    items: [
      { title: "Jungle Cruise", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Jungle Cruise"] },
      { title: "Pirates of the Caribbean", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Pirates of the Caribbean"] },
      { title: "Haunted Mansion", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Haunted Mansion"] },
      breakItem("Lunch and a breather", "AFTERNOON", "Pick a nearby meal and give everyone time to recharge."),
      { title: "Mickey's PhilharMagic", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Mickey's PhilharMagic", "Mickey’s PhilharMagic"] },
      { title: "Seven Dwarfs Mine Train", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Seven Dwarfs Mine Train"] },
      { title: "Happily Ever After", timing: "EVENING", entityType: "SHOW", matchNames: ["Happily Ever After"] },
    ],
  },
  {
    id: "mk-little-dreamers",
    park: "mk",
    title: "Little dreamers",
    bestFor: "Young children",
    pace: "Gentle",
    description: "Friendly rides, an indoor show, parade time, and an easy rhythm.",
    items: [
      { title: "The Many Adventures of Winnie the Pooh", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["The Many Adventures of Winnie the Pooh"] },
      { title: "Dumbo the Flying Elephant", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Dumbo the Flying Elephant"] },
      { title: "Under the Sea — Journey of The Little Mermaid", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Under the Sea - Journey of The Little Mermaid", "Under the Sea ~ Journey of The Little Mermaid"] },
      breakItem("Lunch and quiet time", "AFTERNOON", "Slow down before the warmest and busiest part of the day."),
      { title: "Mickey's PhilharMagic", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Mickey's PhilharMagic", "Mickey’s PhilharMagic"] },
      { title: "Disney Festival of Fantasy Parade", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Disney Festival of Fantasy Parade", "Festival of Fantasy Parade"] },
      { title: "It's a Small World", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["it's a small world", "It’s a Small World"] },
    ],
  },
  {
    id: "mk-big-thrills",
    park: "mk",
    title: "Big thrills and big finish",
    bestFor: "Thrill seekers",
    pace: "Energetic",
    description: "The park's biggest adventures with classics between them.",
    items: [
      { title: "TRON Lightcycle / Run", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["TRON Lightcycle / Run", "TRON Lightcycle Run"] },
      { title: "Space Mountain", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Space Mountain"] },
      { title: "Tiana's Bayou Adventure", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Tiana's Bayou Adventure", "Tiana’s Bayou Adventure"] },
      breakItem("Lunch and reset", "AFTERNOON", "Use this flexible pause wherever waits and weather make sense."),
      { title: "Haunted Mansion", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Haunted Mansion"] },
      { title: "Seven Dwarfs Mine Train", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Seven Dwarfs Mine Train"] },
      { title: "Happily Ever After", timing: "EVENING", entityType: "SHOW", matchNames: ["Happily Ever After"] },
    ],
  },
  {
    id: "mk-classic-calm",
    park: "mk",
    title: "Classic Magic, easy pace",
    bestFor: "Mixed ages",
    pace: "Relaxed",
    description: "Beloved originals, indoor breaks, and less rushing across the park.",
    items: [
      { title: "Jungle Cruise", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Jungle Cruise"] },
      { title: "Pirates of the Caribbean", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Pirates of the Caribbean"] },
      { title: "Haunted Mansion", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Haunted Mansion"] },
      { title: "Country Bear Musical Jamboree", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Country Bear Musical Jamboree"] },
      { title: "Walt Disney's Carousel of Progress", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Walt Disney's Carousel of Progress", "Walt Disney’s Carousel of Progress"] },
      { title: "Tomorrowland Transit Authority PeopleMover", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Tomorrowland Transit Authority PeopleMover", "PeopleMover"] },
      { title: "Happily Ever After", timing: "EVENING", entityType: "SHOW", matchNames: ["Happily Ever After"] },
    ],
  },
  {
    id: "mk-late-start",
    park: "mk",
    title: "Sleep in, stay for the sparkle",
    bestFor: "Late starts",
    pace: "Shorter day",
    description: "A focused afternoon that finishes with nighttime magic.",
    items: [
      { title: "Pirates of the Caribbean", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Pirates of the Caribbean"] },
      { title: "Haunted Mansion", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Haunted Mansion"] },
      { title: "Mickey's PhilharMagic", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Mickey's PhilharMagic", "Mickey’s PhilharMagic"] },
      breakItem("Dinner and Main Street wander", "EVENING", "Leave room to eat and enjoy the atmosphere before the finale."),
      { title: "Tomorrowland Transit Authority PeopleMover", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Tomorrowland Transit Authority PeopleMover", "PeopleMover"] },
      { title: "Happily Ever After", timing: "EVENING", entityType: "SHOW", matchNames: ["Happily Ever After"] },
    ],
  },
  {
    id: "epcot-first-visit",
    park: "epcot",
    title: "EPCOT essentials",
    bestFor: "First visits",
    pace: "Full day",
    description: "Two popular adventures, classic EPCOT, World Showcase, and the lagoon finale.",
    items: [
      { title: "Frozen Ever After", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Frozen Ever After"] },
      { title: "Remy's Ratatouille Adventure", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Remy's Ratatouille Adventure", "Remy’s Ratatouille Adventure"] },
      breakItem("World Showcase lunch and stroll", "AFTERNOON", "Choose a country to explore without turning the afternoon into a race."),
      { title: "Gran Fiesta Tour Starring The Three Caballeros", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Gran Fiesta Tour Starring The Three Caballeros"] },
      { title: "Spaceship Earth", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Spaceship Earth"] },
      { title: "Soarin'", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Soarin' Around the World", "Soarin’ Around the World", "Soarin' Across America", "Soarin’ Across America"] },
      { title: "Luminous The Symphony of Us", timing: "EVENING", entityType: "SHOW", matchNames: ["Luminous The Symphony of Us", "Luminous: The Symphony of Us"] },
    ],
  },
  {
    id: "epcot-big-rides",
    park: "epcot",
    title: "Big rides, then the world",
    bestFor: "Thrill seekers",
    pace: "Energetic",
    description: "Front-of-park headliners first, followed by a looser World Showcase evening.",
    items: [
      { title: "Test Track", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Test Track"] },
      { title: "Guardians of the Galaxy: Cosmic Rewind", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Guardians of the Galaxy: Cosmic Rewind"] },
      { title: "Mission: SPACE", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Mission: SPACE"] },
      breakItem("Lunch and recharge", "AFTERNOON", "Keep this movable in case a headliner takes longer than expected."),
      { title: "Soarin'", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Soarin' Around the World", "Soarin’ Around the World", "Soarin' Across America", "Soarin’ Across America"] },
      breakItem("World Showcase wander", "EVENING", "Pick a few pavilions instead of trying to complete every country."),
      { title: "Luminous The Symphony of Us", timing: "EVENING", entityType: "SHOW", matchNames: ["Luminous The Symphony of Us", "Luminous: The Symphony of Us"] },
    ],
  },
  {
    id: "epcot-little-explorers",
    park: "epcot",
    title: "Little explorers",
    bestFor: "Young children",
    pace: "Gentle",
    description: "Colorful rides, animals, water play, and plenty of indoor time.",
    items: [
      { title: "Frozen Ever After", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Frozen Ever After"] },
      { title: "Remy's Ratatouille Adventure", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Remy's Ratatouille Adventure", "Remy’s Ratatouille Adventure"] },
      { title: "The Seas with Nemo & Friends", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["The Seas with Nemo & Friends"] },
      breakItem("Aquarium and snack time", "AFTERNOON", "Linger indoors and follow the children's energy."),
      { title: "Journey of Water, Inspired by Moana", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Journey of Water, Inspired by Moana", "Journey of Water Inspired by Moana"] },
      { title: "Journey Into Imagination With Figment", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Journey Into Imagination With Figment", "Journey Into Imagination with Figment"] },
      { title: "Gran Fiesta Tour Starring The Three Caballeros", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Gran Fiesta Tour Starring The Three Caballeros"] },
    ],
  },
  {
    id: "epcot-taste-and-explore",
    park: "epcot",
    title: "Taste and explore",
    bestFor: "Adults and food fans",
    pace: "Relaxed",
    description: "A slow World Showcase day with a few signature EPCOT attractions.",
    items: [
      { title: "Remy's Ratatouille Adventure", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Remy's Ratatouille Adventure", "Remy’s Ratatouille Adventure"] },
      breakItem("World Showcase tasting stroll", "AFTERNOON", "Choose a few favorites and share portions so the day stays comfortable."),
      { title: "The American Adventure", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["The American Adventure"] },
      { title: "Gran Fiesta Tour Starring The Three Caballeros", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Gran Fiesta Tour Starring The Three Caballeros"] },
      { title: "Living with the Land", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Living with the Land"] },
      breakItem("Lagoon-side dinner", "EVENING", "Reserve ahead if a particular restaurant matters to your group."),
      { title: "Luminous The Symphony of Us", timing: "EVENING", entityType: "SHOW", matchNames: ["Luminous The Symphony of Us", "Luminous: The Symphony of Us"] },
    ],
  },
  {
    id: "epcot-late-start",
    park: "epcot",
    title: "An unhurried EPCOT evening",
    bestFor: "Late starts",
    pace: "Shorter day",
    description: "Classic discoveries and World Showcase without an early alarm.",
    items: [
      { title: "Spaceship Earth", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Spaceship Earth"] },
      { title: "The Seas with Nemo & Friends", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["The Seas with Nemo & Friends"] },
      { title: "Journey of Water, Inspired by Moana", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Journey of Water, Inspired by Moana", "Journey of Water Inspired by Moana"] },
      breakItem("World Showcase dinner and stroll", "EVENING", "Choose one area to savor instead of crisscrossing the lagoon."),
      { title: "Frozen Ever After", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Frozen Ever After"] },
      { title: "Luminous The Symphony of Us", timing: "EVENING", entityType: "SHOW", matchNames: ["Luminous The Symphony of Us", "Luminous: The Symphony of Us"] },
    ],
  },
  {
    id: "hs-first-visit",
    park: "hs",
    title: "Hollywood highlights",
    bestFor: "First visits",
    pace: "Full day",
    description: "Toy Story, Star Wars, a classic thrill, and Fantasmic to close.",
    items: [
      { title: "Slinky Dog Dash", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Slinky Dog Dash"] },
      { title: "Toy Story Mania!", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Toy Story Mania!", "Toy Story Mania"] },
      { title: "Mickey & Minnie's Runaway Railway", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Mickey & Minnie's Runaway Railway", "Mickey & Minnie’s Runaway Railway"] },
      breakItem("Lunch and reset", "AFTERNOON", "Let the next wait time decide which land comes next."),
      { title: "Star Wars: Rise of the Resistance", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Star Wars: Rise of the Resistance", "Rise of the Resistance"] },
      { title: "The Twilight Zone Tower of Terror", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["The Twilight Zone Tower of Terror", "Tower of Terror"] },
      { title: "Fantasmic!", timing: "EVENING", entityType: "SHOW", matchNames: ["Fantasmic!", "Fantasmic"] },
    ],
  },
  {
    id: "hs-little-stars",
    park: "hs",
    title: "Little stars and big shows",
    bestFor: "Young children",
    pace: "Gentle",
    description: "Toy Story fun, familiar characters, and seated shows between adventures.",
    items: [
      { title: "Mickey & Minnie's Runaway Railway", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Mickey & Minnie's Runaway Railway", "Mickey & Minnie’s Runaway Railway"] },
      { title: "Toy Story Mania!", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Toy Story Mania!", "Toy Story Mania"] },
      { title: "Alien Swirling Saucers", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Alien Swirling Saucers"] },
      breakItem("Lunch and character time", "AFTERNOON", "Use the app to choose a nearby character greeting or meal."),
      { title: "For the First Time in Forever: A Frozen Sing-Along Celebration", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["For the First Time in Forever: A Frozen Sing-Along Celebration", "Frozen Sing-Along Celebration"] },
      { title: "Beauty and the Beast – Live on Stage", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Beauty and the Beast - Live on Stage", "Beauty and the Beast – Live on Stage"] },
      { title: "Fantasmic!", timing: "EVENING", entityType: "SHOW", matchNames: ["Fantasmic!", "Fantasmic"] },
    ],
  },
  {
    id: "hs-big-thrills",
    park: "hs",
    title: "Headliners and heroes",
    bestFor: "Thrill seekers",
    pace: "Energetic",
    description: "The hardest-to-do rides, grouped with flexible breaks and a nighttime show.",
    items: [
      { title: "Slinky Dog Dash", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Slinky Dog Dash"] },
      { title: "Star Wars: Rise of the Resistance", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Star Wars: Rise of the Resistance", "Rise of the Resistance"] },
      { title: "Millennium Falcon: Smugglers Run", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Millennium Falcon: Smugglers Run", "Millennium Falcon - Smugglers Run"] },
      breakItem("Lunch and recovery", "AFTERNOON", "Keep this movable; the biggest rides can be unpredictable."),
      { title: "Star Tours – The Adventures Continue", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Star Tours - The Adventures Continue", "Star Tours – The Adventures Continue"] },
      { title: "The Twilight Zone Tower of Terror", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["The Twilight Zone Tower of Terror", "Tower of Terror"] },
      { title: "Fantasmic!", timing: "EVENING", entityType: "SHOW", matchNames: ["Fantasmic!", "Fantasmic"] },
    ],
  },
  {
    id: "hs-galaxy-day",
    park: "hs",
    title: "A galaxy far, far away",
    bestFor: "Star Wars fans",
    pace: "Focused",
    description: "A Star Wars-centered day with enough room to explore rather than rush.",
    items: [
      { title: "Star Wars: Rise of the Resistance", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Star Wars: Rise of the Resistance", "Rise of the Resistance"] },
      { title: "Millennium Falcon: Smugglers Run", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Millennium Falcon: Smugglers Run", "Millennium Falcon - Smugglers Run"] },
      breakItem("Explore Galaxy's Edge", "AFTERNOON", "Slow down for characters, shops, details, and photos."),
      breakItem("Outpost lunch or snack", "AFTERNOON", "Choose quick service or a reservation that fits your group."),
      { title: "Star Tours – The Adventures Continue", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Star Tours - The Adventures Continue", "Star Tours – The Adventures Continue"] },
      { title: "Mickey & Minnie's Runaway Railway", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Mickey & Minnie's Runaway Railway", "Mickey & Minnie’s Runaway Railway"] },
      { title: "Fantasmic!", timing: "EVENING", entityType: "SHOW", matchNames: ["Fantasmic!", "Fantasmic"] },
    ],
  },
  {
    id: "hs-late-start",
    park: "hs",
    title: "Shows and a cinematic night",
    bestFor: "Late starts",
    pace: "Shorter day",
    description: "An afternoon of attractions and seated shows ending with Fantasmic.",
    items: [
      { title: "Mickey & Minnie's Runaway Railway", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Mickey & Minnie's Runaway Railway", "Mickey & Minnie’s Runaway Railway"] },
      { title: "For the First Time in Forever: A Frozen Sing-Along Celebration", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["For the First Time in Forever: A Frozen Sing-Along Celebration", "Frozen Sing-Along Celebration"] },
      { title: "Indiana Jones Epic Stunt Spectacular!", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Indiana Jones Epic Stunt Spectacular!", "Indiana Jones Epic Stunt Spectacular"] },
      { title: "Toy Story Mania!", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Toy Story Mania!", "Toy Story Mania"] },
      breakItem("Sunset Boulevard dinner", "EVENING", "Eat before lining up for the night's final show."),
      { title: "Fantasmic!", timing: "EVENING", entityType: "SHOW", matchNames: ["Fantasmic!", "Fantasmic"] },
    ],
  },
  {
    id: "ak-first-visit",
    park: "ak",
    title: "The wild highlights",
    bestFor: "First visits",
    pace: "Full day",
    description: "Pandora, animals, a live show, and a coaster with time to wander.",
    items: [
      { title: "Avatar Flight of Passage", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Avatar Flight of Passage"] },
      { title: "Na'vi River Journey", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Na'vi River Journey", "Na’vi River Journey"] },
      { title: "Kilimanjaro Safaris", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Kilimanjaro Safaris"] },
      breakItem("Lunch and shaded reset", "AFTERNOON", "Animal Kingdom rewards a slower middle of the day."),
      { title: "Festival of the Lion King", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Festival of the Lion King", "A Celebration of Festival of the Lion King"] },
      { title: "Expedition Everest", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Expedition Everest - Legend of the Forbidden Mountain", "Expedition Everest"] },
      breakItem("Pandora after dark", "EVENING", "Return when the land begins to glow, if the park is open late enough."),
    ],
  },
  {
    id: "ak-little-explorers",
    park: "ak",
    title: "Little wildlife explorers",
    bestFor: "Young children",
    pace: "Gentle",
    description: "Animals, trails, music, and one calm boat ride with frequent breaks.",
    items: [
      { title: "Kilimanjaro Safaris", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Kilimanjaro Safaris"] },
      { title: "Gorilla Falls Exploration Trail", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Gorilla Falls Exploration Trail"] },
      { title: "Festival of the Lion King", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Festival of the Lion King", "A Celebration of Festival of the Lion King"] },
      breakItem("Lunch and discovery time", "AFTERNOON", "Follow the children's interests and leave room for animal stops."),
      { title: "Maharajah Jungle Trek", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Maharajah Jungle Trek"] },
      { title: "Feathered Friends in Flight!", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Feathered Friends in Flight!", "Feathered Friends in Flight"] },
      { title: "Na'vi River Journey", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Na'vi River Journey", "Na’vi River Journey"] },
    ],
  },
  {
    id: "ak-adventure",
    park: "ak",
    title: "Adventure trail",
    bestFor: "Thrill seekers",
    pace: "Energetic",
    description: "The park's biggest rides balanced with animals and a show.",
    items: [
      { title: "Avatar Flight of Passage", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Avatar Flight of Passage"] },
      { title: "Expedition Everest", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Expedition Everest - Legend of the Forbidden Mountain", "Expedition Everest"] },
      { title: "Kilimanjaro Safaris", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Kilimanjaro Safaris"] },
      { title: "Kali River Rapids", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Kali River Rapids"] },
      breakItem("Lunch and dry-off break", "AFTERNOON", "Use this as a flexible recovery window."),
      { title: "Festival of the Lion King", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Festival of the Lion King", "A Celebration of Festival of the Lion King"] },
      breakItem("Pandora after dark", "EVENING", "Return if park hours allow; otherwise enjoy one final favorite."),
    ],
  },
  {
    id: "ak-animals-shows",
    park: "ak",
    title: "Animals and live shows",
    bestFor: "All generations",
    pace: "Relaxed",
    description: "A low-pressure route through the park's wildlife, trails, and performances.",
    items: [
      { title: "Kilimanjaro Safaris", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Kilimanjaro Safaris"] },
      { title: "Gorilla Falls Exploration Trail", timing: "MORNING", entityType: "ATTRACTION", matchNames: ["Gorilla Falls Exploration Trail"] },
      { title: "Festival of the Lion King", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Festival of the Lion King", "A Celebration of Festival of the Lion King"] },
      breakItem("Lunch and people-watching", "AFTERNOON", "Choose a shaded spot and keep the pace comfortable."),
      { title: "Maharajah Jungle Trek", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Maharajah Jungle Trek"] },
      { title: "Feathered Friends in Flight!", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Feathered Friends in Flight!", "Feathered Friends in Flight"] },
      { title: "Finding Nemo: The Big Blue... and Beyond!", timing: "EVENING", entityType: "SHOW", matchNames: ["Finding Nemo: The Big Blue... and Beyond!", "Finding Nemo: The Big Blue and Beyond"] },
    ],
  },
  {
    id: "ak-late-start",
    park: "ak",
    title: "A shorter wild afternoon",
    bestFor: "Late starts",
    pace: "Shorter day",
    description: "A safari, a trail, a show, and one major adventure without overfilling the day.",
    items: [
      { title: "Kilimanjaro Safaris", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Kilimanjaro Safaris"] },
      { title: "Gorilla Falls Exploration Trail", timing: "AFTERNOON", entityType: "ATTRACTION", matchNames: ["Gorilla Falls Exploration Trail"] },
      { title: "Festival of the Lion King", timing: "AFTERNOON", entityType: "SHOW", matchNames: ["Festival of the Lion King", "A Celebration of Festival of the Lion King"] },
      breakItem("Early dinner and a breather", "EVENING", "Check closing time before deciding what follows."),
      { title: "Expedition Everest", timing: "EVENING", entityType: "ATTRACTION", matchNames: ["Expedition Everest - Legend of the Forbidden Mountain", "Expedition Everest"] },
      breakItem("Pandora twilight stroll", "EVENING", "Enjoy the atmosphere if the park remains open after sunset."),
    ],
  },
];

export function getCuratedPlans(themeId: DayThemeId) {
  return CURATED_DAY_PLANS.filter((plan) => plan.park === themeId);
}

export function getCuratedPlan(planId: string) {
  return CURATED_DAY_PLANS.find((plan) => plan.id === planId);
}
