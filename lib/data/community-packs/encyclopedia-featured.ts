import { pack, qa, type CommunitySeedPack } from "./types";
import type { HkGradeId } from "@/lib/community/hk-curriculum";

type Band = "primary" | "junior" | "senior";

const BAND: Record<
  Band,
  { slug: string; label: string; grade: HkGradeId }
> = {
  primary: { slug: "primary", label: "Primary", grade: "p3" },
  junior: { slug: "junior", label: "Junior", grade: "s2" },
  senior: { slug: "senior", label: "Senior", grade: "s5" },
};

type Fact = {
  artKey: string;
  query: string;
  category: string;
  primary: [string, string];
  junior: [string, string];
  senior: [string, string];
};

function series(
  topicKey: string,
  topicTitle: string,
  subject: string,
  facts: Fact[],
): CommunitySeedPack[] {
  return (Object.keys(BAND) as Band[]).map((band) => {
    const meta = BAND[band];
    return pack(
      `ency-${topicKey}-${meta.slug}`,
      `${topicTitle} · ${meta.label}`,
      subject,
      meta.grade,
      facts.map((fact) =>
        qa(fact[band][0], fact[band][1], fact.category, {
          artKey: fact.artKey,
          imageSearchQuery: fact.query,
        }),
      ),
      true,
    );
  });
}

export const ENCYCLOPEDIA_FEATURED_PACKS: CommunitySeedPack[] = [
  ...series("solar", "Solar System", "science", [
    { artKey: "solar/sun", query: "Sun photosphere NASA", category: "Sun", primary: ["What is the Sun?", "A star that gives Earth light and heat."], junior: ["What kind of object is the Sun?", "A star — a ball of hot glowing gas."], senior: ["What process powers the Sun?", "Nuclear fusion of hydrogen into helium in the core."] },
    { artKey: "solar/earth", query: "Earth from space NASA", category: "Earth", primary: ["Which planet do we live on?", "Earth."], junior: ["Why can people live on Earth?", "It has air, water, and a temperature we can survive."], senior: ["What is Earth’s atmosphere mostly made of?", "Nitrogen, plus oxygen and other gases."] },
    { artKey: "solar/moon", query: "full Moon", category: "Moon", primary: ["What is the Moon?", "Earth’s natural satellite."], junior: ["Why does the Moon look different each night?", "We see different amounts of the sunlit side (phases)."], senior: ["What mainly causes ocean tides on Earth?", "The Moon’s gravity."] },
    { artKey: "solar/mars", query: "planet Mars", category: "Planets", primary: ["Which planet is often called the Red Planet?", "Mars."], junior: ["Why does Mars look red?", "Iron oxide (rust) in its soil and dust."], senior: ["What are the two small moons of Mars called?", "Phobos and Deimos."] },
    { artKey: "solar/jupiter", query: "planet Jupiter", category: "Planets", primary: ["Which is the largest planet?", "Jupiter."], junior: ["What is Jupiter mostly made of?", "Hydrogen and helium gas."], senior: ["What is Jupiter’s Great Red Spot?", "A giant long-lived storm in its atmosphere."] },
    { artKey: "solar/saturn", query: "Saturn rings", category: "Planets", primary: ["Which planet is famous for bright rings?", "Saturn."], junior: ["What are Saturn’s rings made of?", "Mostly ice and rock pieces."], senior: ["What are Saturn’s rings?", "Countless icy particles orbiting in a thin disk."] },
    { artKey: "solar/mercury", query: "planet Mercury", category: "Planets", primary: ["Which planet is closest to the Sun?", "Mercury."], junior: ["Why is Mercury very hot and very cold?", "It is close to the Sun and has almost no air to hold heat."], senior: ["Why does Mercury have such a large temperature range?", "Almost no atmosphere and a slow rotation."] },
    { artKey: "solar/comet", query: "comet tail", category: "Small bodies", primary: ["What is a comet?", "A dirty snowball of ice and dust in space."], junior: ["Why does a comet grow a tail near the Sun?", "Heat turns ice to gas and pushes dust away."], senior: ["What two tails can a comet show?", "A dust tail and an ion (gas) tail."] },
    { artKey: "solar/asteroid", query: "asteroid", category: "Small bodies", primary: ["What is an asteroid?", "A rocky leftover from when the planets formed."], junior: ["Where do many asteroids orbit?", "The asteroid belt between Mars and Jupiter."], senior: ["What is the main asteroid belt?", "A region of rocky bodies between Mars and Jupiter."] },
    { artKey: "solar/neptune", query: "planet Neptune", category: "Planets", primary: ["Which planet is farthest from the Sun (of the eight)?", "Neptune."], junior: ["What colour is Neptune, roughly?", "Deep blue."], senior: ["Why does Neptune appear blue?", "Methane in its atmosphere absorbs red light."] },
  ]),
  ...series("continents", "Continents", "geography", [
    { artKey: "geo/africa", query: "Africa continent map", category: "Africa", primary: ["Which continent is the Sahara Desert in?", "Africa."], junior: ["Which is Earth’s second-largest continent?", "Africa."], senior: ["What is the world’s largest hot desert, in Africa?", "The Sahara."] },
    { artKey: "geo/asia", query: "Asia continent map", category: "Asia", primary: ["Which continent is China in?", "Asia."], junior: ["Which continent has the most people?", "Asia."], senior: ["Which is Earth’s largest continent by area?", "Asia."] },
    { artKey: "geo/europe", query: "Europe continent map", category: "Europe", primary: ["Which continent is France in?", "Europe."], junior: ["Europe is attached to which larger landmass?", "Asia (Eurasia)."], senior: ["What conventional divide is often used between Europe and Asia?", "The Ural Mountains (among other lines)."] },
    { artKey: "geo/americas", query: "North America continent map", category: "Americas", primary: ["Which continent is Canada in?", "North America."], junior: ["The Andes mountains run along which continent?", "South America."], senior: ["What is the world’s longest mountain range on land?", "The Andes."] },
    { artKey: "geo/antarctica", query: "Antarctica ice", category: "Antarctica", primary: ["Which continent is covered mostly in ice?", "Antarctica."], junior: ["Why is Antarctica so cold?", "It is at the South Pole and high, icy, and isolated."], senior: ["About what fraction of Earth’s fresh water is locked in Antarctic ice?", "A very large share — most of it."] },
    { artKey: "geo/australia", query: "Australia continent", category: "Oceania", primary: ["Which continent is also a country?", "Australia."], junior: ["Australia is part of which wider region of islands?", "Oceania."], senior: ["What is the name for Australia plus nearby Pacific islands as a region?", "Oceania."] },
    { artKey: "geo/equator", query: "Earth equator globe", category: "Earth", primary: ["What is the equator?", "An imaginary line around Earth’s middle."], junior: ["Places near the equator are usually…?", "Warmer, with more direct sunlight."], senior: ["The equator is at what latitude?", "0°."] },
    { artKey: "geo/ocean", query: "Pacific Ocean", category: "Oceans", primary: ["What is the largest ocean?", "The Pacific Ocean."], junior: ["Name Earth’s five oceans.", "Pacific, Atlantic, Indian, Southern, Arctic."], senior: ["Which ocean is the deepest on average?", "The Pacific."] },
    { artKey: "geo/island", query: "volcanic island", category: "Land", primary: ["What is an island?", "Land with water all around it."], junior: ["What is an archipelago?", "A group of islands."], senior: ["What is a continental island vs a volcanic island?", "One broken from a continent vs one built by volcanoes."] },
    { artKey: "geo/river", query: "Nile river", category: "Water", primary: ["What is a river?", "Fresh water flowing toward a sea, lake, or another river."], junior: ["What is a river’s mouth?", "Where it meets the sea or a lake."], senior: ["What is a drainage basin?", "The land that sheds water into one river system."] },
  ]),
  ...series("body", "Human Body", "biology", [
    { artKey: "body/heart", query: "human heart anatomy", category: "Organs", primary: ["What does the heart do?", "It pumps blood around the body."], junior: ["How many chambers does the human heart have?", "Four."], senior: ["Which side of the heart pumps blood to the lungs?", "The right side."] },
    { artKey: "body/lungs", query: "human lungs", category: "Organs", primary: ["What do lungs help you do?", "Breathe — take in oxygen."], junior: ["What gas do we breathe out more of?", "Carbon dioxide."], senior: ["Where does gas exchange happen in the lungs?", "In the alveoli."] },
    { artKey: "body/brain", query: "human brain", category: "Organs", primary: ["What organ helps you think?", "The brain."], junior: ["The brain and spinal cord make up the…?", "Central nervous system."], senior: ["What does the cerebrum mainly do?", "Higher thinking, senses, and voluntary movement."] },
    { artKey: "body/skeleton", query: "human skeleton", category: "Bones", primary: ["What holds your body up?", "Bones / the skeleton."], junior: ["About how many bones does an adult have?", "206."], senior: ["What do red bone marrow produce?", "Blood cells."] },
    { artKey: "body/muscle", query: "skeletal muscle", category: "Muscles", primary: ["What lets you move your arms?", "Muscles."], junior: ["Name two types of muscle.", "Skeletal, smooth, or cardiac."], senior: ["What is a voluntary muscle?", "A muscle you can control, like biceps."] },
    { artKey: "body/stomach", query: "human stomach", category: "Digestion", primary: ["Where does food go after you swallow?", "The stomach (via the oesophagus)."], junior: ["What does the stomach add to food?", "Acid and enzymes that start digestion."], senior: ["What is chyme?", "The partly digested food mixture leaving the stomach."] },
    { artKey: "body/eye", query: "human eye", category: "Senses", primary: ["What organ do you see with?", "The eyes."], junior: ["What part of the eye lets light in?", "The pupil (and cornea)."], senior: ["Where are images focused in the eye?", "On the retina."] },
    { artKey: "body/ear", query: "human ear", category: "Senses", primary: ["What organ do you hear with?", "The ears."], junior: ["What is the eardrum’s job?", "It vibrates when sound hits it."], senior: ["Which inner-ear organ senses hearing?", "The cochlea."] },
    { artKey: "body/skin", query: "human skin", category: "Skin", primary: ["What covers your whole body?", "Skin."], junior: ["Name one job of skin.", "Protection, sensing, or helping control temperature."], senior: ["What is the outer layer of skin called?", "The epidermis."] },
    { artKey: "body/blood", query: "red blood cells", category: "Blood", primary: ["What does blood carry?", "Oxygen, food, and waste around the body."], junior: ["What cells carry oxygen?", "Red blood cells."], senior: ["Which molecule in red blood cells binds oxygen?", "Haemoglobin."] },
  ]),
  ...series("plants", "Plants", "science", [
    { artKey: "plants/leaf", query: "green leaf photosynthesis", category: "Leaves", primary: ["Why are most leaves green?", "They contain chlorophyll."], junior: ["What do leaves make with sunlight?", "Food (sugar) by photosynthesis."], senior: ["What gas do plants take in for photosynthesis?", "Carbon dioxide."] },
    { artKey: "plants/flower", query: "flowering plant", category: "Flowers", primary: ["What part of a plant often has petals?", "The flower."], junior: ["What is a flower’s job?", "Reproduction — making seeds."], senior: ["What is pollination?", "Transfer of pollen to a stigma so seeds can form."] },
    { artKey: "plants/root", query: "plant roots soil", category: "Roots", primary: ["What part of a plant is usually underground?", "The roots."], junior: ["What do roots take from the soil?", "Water and minerals."], senior: ["What is a taproot?", "A large main root with smaller side roots."] },
    { artKey: "plants/seed", query: "plant seeds", category: "Seeds", primary: ["What can grow into a new plant?", "A seed."], junior: ["What does a seed need to germinate?", "Water, warmth, and usually air."], senior: ["What is the seed’s embryo?", "The tiny plant inside the seed."] },
    { artKey: "plants/tree", query: "oak tree", category: "Trees", primary: ["What is a tree?", "A tall plant with a woody stem (trunk)."], junior: ["What does tree bark do?", "It protects the trunk."], senior: ["What tissue carries water up a tree?", "Xylem."] },
    { artKey: "plants/fruit", query: "apple fruit", category: "Fruit", primary: ["What is a fruit in everyday talk?", "The sweet part that holds seeds, like an apple."], junior: ["In science, a fruit develops from what?", "A flower’s ovary."], senior: ["Why do plants make fleshy fruits?", "To spread seeds, often via animals."] },
    { artKey: "plants/cactus", query: "cactus desert", category: "Adaptations", primary: ["Where do many cacti live?", "Deserts."], junior: ["How do cacti store water?", "In thick stems."], senior: ["Why do many cacti have spines instead of wide leaves?", "To cut water loss."] },
    { artKey: "plants/fern", query: "fern plant", category: "Groups", primary: ["Do ferns have flowers?", "No."], junior: ["How do ferns reproduce?", "With spores, not seeds."], senior: ["Where are fern spores usually made?", "On the underside of fronds."] },
    { artKey: "plants/oxygen", query: "forest trees", category: "Air", primary: ["What useful gas do plants give out?", "Oxygen."], junior: ["When do plants release extra oxygen?", "During photosynthesis in light."], senior: ["Photosynthesis word equation (simple)?", "Carbon dioxide + water → glucose + oxygen (light)."] },
    { artKey: "plants/stem", query: "plant stem", category: "Stems", primary: ["What holds a plant up?", "The stem."], junior: ["What does a stem carry?", "Water and food between roots and leaves."], senior: ["What is phloem’s job?", "Transport sugars from leaves to other parts."] },
  ]),
  ...series("colour", "Colour & Light", "visual-arts", [
    { artKey: "colour/rainbow", query: "rainbow spectrum", category: "Spectrum", primary: ["What do you see after rain and sun together?", "A rainbow."], junior: ["What splits sunlight into a rainbow?", "Water drops (refraction and reflection)."], senior: ["White light is a mix of…?", "Many wavelengths (a spectrum)."] },
    { artKey: "colour/red", query: "red colour", category: "Primaries", primary: ["Name a primary colour.", "Red, yellow, or blue (paint)."], junior: ["In paint, what are the three primary colours?", "Red, yellow, and blue."], senior: ["In light (RGB), the primaries are?", "Red, green, and blue."] },
    { artKey: "colour/mix", query: "paint mixing palette", category: "Mixing", primary: ["What happens if you mix yellow and blue paint?", "You get green."], junior: ["Red + yellow paint makes…?", "Orange."], senior: ["Subtractive mixing is used in…?", "Paints, inks, and dyes."] },
    { artKey: "colour/shadow", query: "shadow sunlight", category: "Light", primary: ["What makes a shadow?", "An object blocking light."], junior: ["When is a shadow longest?", "When the Sun is low (morning/evening)."], senior: ["A shadow is a region of…?", "Less illumination because light is blocked."] },
    { artKey: "colour/mirror", query: "mirror reflection", category: "Reflection", primary: ["What does a mirror do?", "It reflects your image."], junior: ["Angle of incidence equals…?", "Angle of reflection."], senior: ["A plane mirror forms what kind of image?", "Virtual, upright, same size."] },
    { artKey: "colour/lens", query: "convex lens", category: "Lenses", primary: ["Glasses use what to help you see?", "Lenses."], junior: ["A convex lens is thicker in the…?", "Middle."], senior: ["What does a convex lens do to parallel rays?", "It converges them toward a focus."] },
    { artKey: "colour/prism", query: "glass prism spectrum", category: "Refraction", primary: ["A glass triangle that makes a rainbow is a…?", "Prism."], junior: ["Why does a prism spread colours?", "Different colours bend by different amounts."], senior: ["Dispersion is…?", "Separation of wavelengths because refractive index varies."] },
    { artKey: "colour/white", query: "white light", category: "Light", primary: ["Sunlight looks what colour to us?", "White (or yellowish)."], junior: ["Is white a single rainbow colour?", "No — it is a mix."], senior: ["Newton showed sunlight contains…?", "A spectrum of colours."] },
    { artKey: "colour/black", query: "black object", category: "Absorption", primary: ["A black shirt on a hot day feels…?", "Warmer — it absorbs more light."], junior: ["Black objects absorb…?", "Most visible light that hits them."], senior: ["A perfect absorber of light would look…?", "Black."] },
    { artKey: "colour/pigment", query: "artist pigments", category: "Materials", primary: ["Paint colour comes from…?", "Pigments."], junior: ["Pigments work by…?", "Absorbing some colours and reflecting others."], senior: ["Why is chlorophyll green?", "It reflects green wavelengths more than others."] },
  ]),
];
