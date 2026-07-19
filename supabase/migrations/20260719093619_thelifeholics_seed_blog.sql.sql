/*
# Auto-profile on signup + blog seed

1. New trigger function
- handle_new_user(): inserts a public.profiles row whenever a new auth.users
  row is created, copying email and the full_name from user metadata.

2. Data
- Seeds 6 blog posts with real, thoughtful content.
*/

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.blog_posts (slug, title, excerpt, body, cover, category, tags, author, reading_minutes, published, published_at)
select 'the-quiet-art-of-beginning-again',
       'The Quiet Art of Beginning Again',
       'On gentleness with yourself when you have been away from your practice — or yourself — for a while.',
       E'# The Quiet Art of Beginning Again\n\nThere is a particular kind of shame that arrives when we have been away from something we love. The meditation cushion gathering dust. The journal with three pages filled and the rest blank. The yoga mat rolled tight in the corner, accusatory.\n\nWe tell ourselves a story about this absence: that it means we have failed, that we are not serious, that we are the kind of person who cannot stick with things.\n\nBut the practice was never about never leaving. It was always about returning.\n\n## The myth of the unbroken streak\n\nModern wellness culture worships consistency. Streaks, checkmarks, calendars with no gaps. But a life is not a habit tracker. Grief arrives. Work swells. Seasons change. The body asks for rest, not effort.\n\nThe unbroken streak is a story of perfection — and perfection is the enemy of presence.\n\n## What beginning again actually requires\n\nIt requires three things, and none of them is guilt:\n\n1. **Permission** — to have been away, without needing to justify it.\n2. **Smallness** — a return so small it cannot fail. One breath. One page. One minute.\n3. **Tenderness** — meeting yourself as you would a friend returning after a long trip, not as a warden counting days absent.\n\n## The practice\n\nToday, sit for one breath. Just one. Notice the chair, the air, the simple fact that you are here. That is the whole practice.\n\nTomorrow, perhaps two breaths. Or perhaps none, and that is fine too.\n\nThe point was never the breath. The point is the returning — and you have already done that, simply by reading this.',
       'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1200',
       'Healing',
       '["mindfulness","self-compassion","practice"]'::jsonb,
       'TheLifeHolics', 5, true, now() - interval '4 days'
where not exists (select 1 from public.blog_posts where slug = 'the-quiet-art-of-beginning-again');

insert into public.blog_posts (slug, title, excerpt, body, cover, category, tags, author, reading_minutes, published, published_at)
select 'on-listening-to-the-body',
       'On Listening to the Body',
       'Your body has been speaking your whole life. The question is whether anyone — including you — has been listening.',
       E'# On Listening to the Body\n\nThe body is not a vehicle for the mind. It is the mind, made physical — a slow, honest record of everything we have lived.\n\nA tight jaw tells a story. A held belly tells another. The shoulders that creep toward the ears by 4pm are not a malfunction; they are a message.\n\n## Why we stop listening\n\nMost of us learned early that the body was not to be trusted. ''You''re not really hungry.'' ''Don''t cry.'' ''Sit still.'' We were taught to override it, and we became expert at overriding it — until the signals grow loud enough that we cannot.\n\nPain. Exhaustion. Illness. Burnout. These are not failures of the body. They are its last-resort language.\n\n## A different relationship\n\nListening is not the same as fixing. It is not diagnosing, correcting, or optimising. It is simply: pausing, and asking, ''what are you trying to tell me?''\n\nAnd then — this is the hard part — believing the answer.\n\n## A small experiment\n\nSomewhere in your day, pause for thirty seconds. Place a hand on your chest or belly. Ask, without needing a clear reply: *what do you need right now?*\n\nYou may hear nothing. That is fine. Listening is a muscle, and most of us are out of shape. But every time you ask, you tell the body: *you are not alone in here. I am listening.*\n\nOver time, it will begin to answer.',
       'https://images.pexels.com/photos/3771115/pexels-photo-3771115.jpeg?auto=compress&cs=tinysrgb&w=1200',
       'Somatic',
       '["body","somatic","awareness"]'::jsonb,
       'TheLifeHolics', 6, true, now() - interval '10 days'
where not exists (select 1 from public.blog_posts where slug = 'on-listening-to-the-body');

insert into public.blog_posts (slug, title, excerpt, body, cover, category, tags, author, reading_minutes, published, published_at)
select 'what-spiritual-psychology-actually-is',
       'What Spiritual Psychology Actually Is',
       'Beyond the buzzwords — a grounded explanation of a field that bridges the soul and the science.',
       E'# What Spiritual Psychology Actually Is\n\nThe word ''spiritual'' makes some people nervous and other people certain. Both reactions miss what spiritual psychology actually is.\n\nIt is not religion. It is not bypassing pain with positivity. It is not crystals and manifesting.\n\nSpiritual psychology is the recognition that a human being is not only a mind and a body, but a meaning-making creature — and that lasting healing must include the dimension of meaning.\n\n## Where it meets traditional therapy\n\nA traditional cognitive approach might ask: *what thought is causing this feeling, and how can we change it?*\n\nA spiritual psychology approach might ask that — and also: *what is this feeling asking of you? What part of your life is it pointing toward? What old story is it carrying?*\n\nIt is not a replacement for evidence-based therapy. It is an expansion of it.\n\n## The questions it holds\n\n- What is this pattern trying to teach me?\n- What am I being invited to release?\n- What would wholeness look like, not just symptom-relief?\n- Who am I beneath the roles I perform?\n\n## Who it helps\n\nPeople who have done ''the work'' intellectually and still feel stuck. People in transition — loss, illness, awakening — who sense there is meaning in what they are moving through. People who long for a therapy that holds the whole of them.\n\nIt is, at its best, therapy that remembers you are a soul.',
       'https://images.pexels.com/photos/3759033/pexels-photo-3759033.jpeg?auto=compress&cs=tinysrgb&w=1200',
       'Spiritual Psychology',
       '["spiritual psychology","therapy","meaning"]'::jsonb,
       'TheLifeHolics', 7, true, now() - interval '18 days'
where not exists (select 1 from public.blog_posts where slug = 'what-spiritual-psychology-actually-is');

insert into public.blog_posts (slug, title, excerpt, body, cover, category, tags, author, reading_minutes, published, published_at)
select 'the-inner-child-is-not-a-metaphor',
       'The Inner Child Is Not a Metaphor',
       'Why the younger self you carry is real, present, and asking for your attention.',
       E'# The Inner Child Is Not a Metaphor\n\nWe talk about the inner child as though it were a useful fiction — a frame, a technique. But anyone who has done this work deeply knows: the younger self is not a concept. It is a presence.\n\nIt is the part of you that still waits at the window. The part that goes very still when someone raises their voice. The part that brightens at small kindnesses and crumples at small rejections, no matter how old the rest of you has grown.\n\n## Why it matters\n\nThe patterns that run your adult life — the over-giving, the over-working, the fear of abandonment, the perfectionism, the inability to receive — were almost all set in motion before you had words for them. They belong to a younger version of you who learned, wisely, how to stay safe in the world they were given.\n\nThat version is still in you, running the software in the background.\n\n## Reparenting\n\nReparenting is the slow, tender practice of becoming the adult that younger self needed. Not by re-living the wound endlessly, but by offering — again and again — the safety, the attention, the permission that was missing.\n\nIt is internal work, but it changes everything external.\n\n## A place to begin\n\nFind a photo of yourself as a child. Spend a minute simply looking. Not analysing. Looking.\n\nThen ask, quietly: *what did you need that you didn''t get?*\n\nThe answer that arrives is the beginning of the work.',
       'https://images.pexels.com/photos/3759106/pexels-photo-3759106.jpeg?auto=compress&cs=tinysrgb&w=1200',
       'Inner Child',
       '["inner child","reparenting","healing"]'::jsonb,
       'TheLifeHolics', 6, true, now() - interval '25 days'
where not exists (select 1 from public.blog_posts where slug = 'the-inner-child-is-not-a-metaphor');

insert into public.blog_posts (slug, title, excerpt, body, cover, category, tags, author, reading_minutes, published, published_at)
select 'five-breath-practices-for-an-anxious-morning',
       'Five Breath Practices for an Anxious Morning',
       'Short, portable practices for the mornings when your nervous system wakes before you do.',
       E'# Five Breath Practices for an Anxious Morning\n\nSome mornings the body wakes already braced. Before the first thought, the chest is tight and the mind is scanning for threats that aren''t there. This is the nervous system, not the soul — and the nervous system speaks the language of breath.\n\nHere are five short practices. None of them will fix everything. All of them will help.\n\n## 1. The long exhale (2 minutes)\n\nInhale for four counts. Exhale for eight. The longer exhale signals safety to the vagus nerve. Do six rounds.\n\n## 2. Box breath (3 minutes)\n\nInhale four, hold four, exhale four, hold four. Steady, even, unhurried. This is the breath soldiers and surgeons use to steady the hands. It will steady you too.\n\n## 3. Physiological sigh (1 minute)\n\nTwo short inhales through the nose, one long exhale through the mouth. The most efficient breath we know for lowering stress in real time. Do three rounds.\n\n## 4. Hand on heart (2 minutes)\n\nOne hand on the heart, one on the belly. Breathe naturally. The warmth and pressure of your own hand is, to the body, a signal of care.\n\n## 5. The naming breath (4 minutes)\n\nAs you inhale, silently name what you feel: *tension, bracing, fear.* As you exhale, offer: *you are allowed to be here.* Naming is not wallowing — it is witnessing. And witnessing changes the brain.\n\n## A note\n\nYou don''t need to do all five. Choose one. Do it poorly. Do it for ninety seconds. The point is not a perfect practice. The point is a kind one.',
       'https://images.pexels.com/photos/3822908/pexels-photo-3822908.jpeg?auto=compress&cs=tinysrgb&w=1200',
       'Practice',
       '["breathwork","anxiety","nervous system"]'::jsonb,
       'TheLifeHolics', 5, true, now() - interval '33 days'
where not exists (select 1 from public.blog_posts where slug = 'five-breath-practices-for-an-anxious-morning');

insert into public.blog_posts (slug, title, excerpt, body, cover, category, tags, author, reading_minutes, published, published_at)
select 'on-grief-and-the-long-hands-of-time',
       'On Grief and the Long Hands of Time',
       'Grief does not move on a schedule. A reflection on loving what you have lost, without letting it own you.',
       E'# On Grief and the Long Hands of Time\n\nWe have inherited a strange idea about grief: that it is a process with an end. That there is a correct arc, a reasonable duration, a point at which one is meant to be ''through it.''\n\nGrief does not agree.\n\n## The real shape of it\n\nGrief is not linear. It is tidal. It comes in waves — sometimes far apart, sometimes stacked one on another — and each wave carries its own weather. A song. A smell. A Tuesday with no particular reason.\n\nThe goal is not to stop the waves. The goal is to grow large enough to hold them.\n\n## What grief is really asking\n\nGrief is love with nowhere to go. It is not a malfunction; it is a measure of how much you cared. To grieve well is to honour that caring — not to perform recovery, but to make room.\n\n## Practical gentleness\n\n- Let the waves come. Fighting them makes them larger.\n- Do not measure your grief against anyone else''s clock.\n- Find one person who does not need you to be further along than you are.\n- When you cannot feel anything, that is also grief. It is not failure.\n\n## In time\n\nThe waves do not stop. But they space out. And between them, life returns — softer, more honest, more awake to what matters. You do not move on from love. You carry it differently.',
       'https://images.pexels.com/photos/3759106/pexels-photo-3759106.jpeg?auto=compress&cs=tinysrgb&w=1200',
       'Grief',
       '["grief","loss","healing"]'::jsonb,
       'TheLifeHolics', 6, true, now() - interval '40 days'
where not exists (select 1 from public.blog_posts where slug = 'on-grief-and-the-long-hands-of-time');
