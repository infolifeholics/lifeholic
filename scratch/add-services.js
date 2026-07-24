const fs = require('fs');
const path = require('path');

const seedFilePath = path.join(__dirname, '..', 'lib', 'seed-data.json');
const data = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));

const newServices = [
  {
    id: "personal-healing-clarity",
    slug: "personal-healing-clarity",
    title: "Personal Healing & Clarity Session",
    short: "A personalized session to gain deep clarity, emotional release and spiritual alignment.",
    description: "This one-on-one session is tailored specifically for your immediate needs. We will unpack current blockages, trace them to their emotional roots, and connect with your inner guidance to retrieve actionable clarity and somatic release.",
    who_for: "Anyone looking for immediate guidance, emotional reset, or breakthroughs in a specific life area.",
    benefits: [
      "Gain immediate perspective on complex issues",
      "Experience deep emotional release",
      "Create alignment with your higher self",
      "Receive personalized integration practices"
    ],
    process: [
      "Tuning in and grounding",
      "Somatic scanning of the issue",
      "Insight integration coaching",
      "Closing guidance and integration steps"
    ],
    duration_minutes: 30,
    price_inr: 4444,
    price_usd: 60,
    mode: "both",
    image: "https://images.pexels.com/photos/3822908/pexels-photo-3822908.jpeg?auto=compress&cs=tinysrgb&w=1200",
    category: "Healing",
    featured: true,
    sort_order: 8,
    created_at: "2026-07-24T15:19:07.000Z",
    active: true
  },
  {
    id: "deep-transformation-program",
    slug: "deep-transformation-program",
    title: "4-Week Deep Transformation Program",
    short: "A highly supported 4-week program for deep internal shifts, somatic release, and integration.",
    description: "A comprehensive journey designed for deep, lasting transformation. Over four consecutive weeks, we work closely to release old stories, repair child parts, restore nervous system regulation, and rebuild your life from a space of authentic wholeness.",
    who_for: "Those ready to dedicate a month to profound reparenting, nervous system integration, and emotional freedom.",
    benefits: [
      "Uncover and heal core childhood coping mechanisms",
      "Establish steady somatic self-regulation tools",
      "Receive continuous integration prompts",
      "Step into grounded confidence and self-worth"
    ],
    process: [
      "Week 1: Intention & somatic mapping",
      "Week 2: Inner child exploration & parts dialogue",
      "Week 3: Somatic release & core belief rewriting",
      "Week 4: Integration and designing your daily path"
    ],
    duration_minutes: 120,
    price_inr: 11000,
    price_usd: 150,
    mode: "both",
    image: "https://images.pexels.com/photos/3182452/pexels-photo-3182452.jpeg?auto=compress&cs=tinysrgb&w=1200",
    category: "Healing",
    featured: true,
    sort_order: 9,
    created_at: "2026-07-24T15:19:07.000Z",
    active: true
  },
  {
    id: "ancestral-healing",
    slug: "ancestral-healing",
    title: "Ancestral Healing Session",
    short: "Uncover and heal inherited family patterns, epigenetic burdens, and ancestral contracts.",
    description: "Epigenetic research tells us we carry the unresolved stories of those who came before us. In this deep, 90-minute session, we trace intergenerational burdens and release inherited family loyalty patterns, returning what isn't yours so you can live your own life.",
    who_for: "Anyone experiencing repeating family patterns, unexplained anxieties, or blocks in prosperity and relationships.",
    benefits: [
      "Identify recurring family emotional loops",
      "Release inherited burdens and family loyalties",
      "Access strength and support from healthy ancestors",
      "Step forward in your lineage as a force of healing"
    ],
    process: [
      "Lineage lineage mapping & scanning",
      "Ancestral guided meditation and connection",
      "Clearing ritual and boundary creation",
      "Lineage blessing integration"
    ],
    duration_minutes: 90,
    price_inr: 21000,
    price_usd: 280,
    mode: "both",
    image: "https://images.pexels.com/photos/3280130/pexels-photo-3280130.jpeg?auto=compress&cs=tinysrgb&w=1200",
    category: "Healing",
    featured: true,
    sort_order: 10,
    created_at: "2026-07-24T15:19:07.000Z",
    active: true
  }
];

newServices.forEach(srv => {
  const exists = data.services.some(s => s.id === srv.id || s.slug === srv.slug);
  if (!exists) {
    data.services.push(srv);
    console.log(`Added service: ${srv.title}`);
  }
});

fs.writeFileSync(seedFilePath, JSON.stringify(data, null, 2));
console.log('Seeding update completed.');
