import type { SeedPage } from "./types"

// The site's two fixed long-form pages. `body` is GitHub-flavoured Markdown
// plus `<u>` for underline (see the content contract's `PageContent.body`) —
// h1 "# ", h2 "## ", h3 "### ", list items "- ", paragraphs as blank-line
// separated text. Converted once from the original site's `aboutBlocks` /
// `essayBlocks` (see `apps/api/scripts/seed.ts` history) and written here as
// a literal so nothing round-trips through a block serialiser at seed time.
export const pages: SeedPage[] = [
  {
    slug: "about",
    title: "About",
    // Portrait of the artist (the original site's About photo).
    image: "/images/about/richard-james.avif",
    // The original site (client-prototypes/Richard James/src/pages/about.astro)
    // passes no explicit `description` to its Seo component, so the page had
    // no page-specific meta description — it fell back to the site-wide
    // default (site.description), which the web layer already does for any
    // page/project with an empty metaDescription. Left unset here to match.
    body: `Richard James studied sculpture at Central Saint Martins in London, spent seven years as a Zen monk, seven years teaching children and later trained as a counsellor.

Jean Laplanche, the French author and psychoanalyst, laid the foundations for what might be called—and become—“Affect Therapy”, where he coined the term the enigmatic message. This message is unconsciously communicated to the child by caregivers and remains hidden: unseen by both them and the child, yet profoundly influential in their lives.

A parallel can be drawn to the inherent implantation of the Unborn/Sunyata in Buddhist psychology. To completely comprehend the “enigmatic message” or the “Unborn” is not possible.

Fortunately, it will remain uncolonised, unpoliced, and resistant to pathology: a mystery. Yielding only occasionally to one who waits with humility and patience.

As John Keats wrote, a negative capability is necessary: the ability to resist explaining away what we do not understand.

It will be felt as an affect—played out pre-cognitively on the skin and in the heart—only later, perhaps, to be known and held gently as compassionate wisdom.

Laplanche, and ultimately Buddhist practice, encourage us to turn this sense into a creative act: to perceive it non-cognitively and to follow it. The artist, the meditator, is not the prime mover.

In my work, there is an attempt to follow the affect: an opening, a doorway, an invitation. A willingness to sit with suffering and vulnerability, and its inherent invitation to closeness.`,
  },
  {
    slug: "essay",
    title: "The Unborn Rags of the Mind",
    // From the original site's essay.astro: `description={essayDescription}`.
    metaDescription:
      "An essay by Richard James on the Buddhist kesa, affect theory and the Unborn — placing the 2,500-year-old robe of discarded rags alongside Massumi and Laplanche to open psychotherapy beyond pathology.",
    body: `# The Unborn Rags of the Mind

## Abstract

Affect theory and Buddhism make interesting companions and lend theoretical expansion/contraction and experiential substance when applied to the sometimes stale world of psychotherapy and counselling. The latter can become neatly boxed and lacks the radical depth of Buddhism and affect theory as expressed by Brian Massumi. As poetry lies at the heart of some of the most subversive philosophy (Spinoza, Nietzsche, Deleueze and Guattari, Derrida, Laplanche, Massumi), so the metaphor of the 2,500 year old Buddhist kesa provides a historical precursor and teaching which, when intimately understood, strips away any possibility of a finite, closed system of knowledge which serves to limit and imprison.

Key words: Kesa, Unborn, affect

## Introduction

Metaphors simmer with suggestions. So too, the garments of a zen priest. The hossu (fly whisk), the begging bowl, the circle and lotus hook of the kesa, the walking staff with its three rings, and even the bold head of the monk, all redolent with surprise when seen for the first time and used as teaching aids to deepen a becoming understanding over time.

This article will look at the metaphor of the kesa and place it within one area of affect theory, in order to expand psychotherapy and prevent its decline into leaden pathology.

The Kesa

The Zen monk’s full kesa, worn for meditation and ceremonies, is modelled on the robe worn by the historical Buddha, Shakyamuni. It is a simple one-piece garment made of a patchwork design, modestly covering most of the body, and draped over the left shoulder.

The original instructions for making the kesa specified that only discarded fabric— pāmsudā— could be used. For example, cloth that has been burned by fire, munched by oxen, gnawed by mice, worn by the dead, a menstruation rag, or an “excrement sweeping cloth”- funzoe in Japanese. (“Tibet House US Cultural Center of H.H. The Dalai Lama,” 2021, para. 1). These rags were then washed, purified, and sewn into a kesa.

Later the robe was made from fabric presented by lay devotees. Overtime, as Buddhist teachings became more mainstream and accepted by society, the merchants and wealthy would present materials, such as silks woven with gold brocade. Twenty years into his ministry, the Buddha formalised the patchwork pattern in the monastic rules as follows:

Once too when the Blessed One was on His way home from Rajagaha to the Southern hills, He said to the venerable Ananda [his disciple attendant or chaplain]:

“Ananda, do you see the land of Magadha laid out in squares, laid out in strips, laid out with borders, laid out with cross-lines?”

“Yes, Lord.”

“Try to arrange robes for bhikkhus [monks] like that, Ananda.”

(Hollenbeck, 2010, p. 2)

The “squares” the Buddha referred to were rice paddy fields. So the pattern of the rice fields was woven into the monks’ clothing.

Hence, the original practical and spiritual interdependence of monastics and laity: the monks depended on the farmers and lay devotees for their food and the monks gave their teaching ( Dharma ) in return.

The humble origins of the kesa were not forgotten and are implicit in the teaching of Buddhist practice. For example, we can see the First Noble Truth, There Is Suffering , mirrored in the discarded and rejected, bloodied, and refused rags used to make the original kesa: a psychological parallel of disturbance which may exist on the edge of consciousness, or are not seen at all. A disturbance that we turn away from and remains hidden, but are actually the very manure and compost of our lives. If we return and remember, and dip our feet in the river, we may yet feel its current and get to know a different, unknowable, unborn teacher.

When a nun places the kesa on her head after morning meditation, she recites: “How great and wondrous are the clothes of enlightenment, formless and embracing every treasure. I wish to unfold the Buddha’s teaching that I may help all living beings” (Jiyū-Kennett, 1993a, The Order of Buddhist Contemplatives, p. 14).

The “formless”, as mentioned above, is sometimes called the Unborn.

## The Unborn and Affect Theory

Perhaps there may be a linguistic equivalent of the Unborn in affect theory. According to Massumi (2019):

Specifically in relation to language, this means that there is an unabsorbed remainder of meaning left over after the statement is said and done. This is meaning that has yet to come to determinate expression, so it is, strictly speaking nonsense. But is not nonsense simply as the opposite of sense. It is nonsense as a surplus of sense, brewing with meanings to come. It is what Guattari, following Hjelmslev, sometimes calls "purport"—pure matter of meaning, as yet syntactically and semantically unformed, but already pragmatically preaccelerated (…) Significations and propositions in the conventional logical sense try to capture affective intensity, and fail. Affect is always already elsewhere before the last "i" is dotted. (p. 114–115)

Hence, affect is autonomous. So too a common meditation experience of the Unborn: a powerful somatic, unabsorbed, a surplus of sense, becoming, yet to come.

In the Heart Sutra of Mahayana Buddhism, monks sing of this insight, “No eye, ear, nose, tongue, sound, colour, touch or objects (…) always becoming” (Jiyū-Kennett, 1993a, The Order of Buddhist Contemplatives, p. 34).

For Massumi (2019) there is a place where “rationality has to learn to be a catalyst, instead of a sovereign” (p. 118). Similarly, in Buddhism there is no sovereign. Any affect or experience has its death implanted: all things are passing.

So too the Unborn is not sovereign—not transcendent—as it needs to be expressed; here, now. There is an impersonal relationship with the personal. The Unborn needs form although form cannot fully express it. It will remain hidden and autonomous —“a permanent periphery” (Wayne Matthews, personal communication, November 10, 2024). And as this autonomy is expressed, it will die. You cannot capture affective intensity. It is already “elsewhere”.

This nonsovereign emptiness is inherent and exterior to the individual who becomes less than, or perhaps as stated by Massumi (2019), “transindividual” (p. 116).

To understand this, bowing is necessary: modesty and humility are necessary. We align with the arrows of a compass in mind and heart which point to the parts and rags that make up the kesa. We may visit one section of the field, one place of intensity, suffering, and transformation, but there is always another. Another place of darkness and Unborn potential, and each refers to the other, each one bows. We are known and unknown in emptiness.

Some of these rags of the kesa come together, just for a while: a becoming and stitching together. At this point, we may perceive a sentient, conscious person, animal, insect, a tree – an awakening, an insight. Just for a while, there is a square earth-bound mandala, a kesa, until the field and person are consumed, and the husks of rice become the compost of a new lotus flower.

The activity and becoming of this Unborn is tantalisingly close to Artaud’s idea of the “body without organs” and the Autonomy of Affect of Masumi.

As for the not born, so it would seem for Massumi that affects precede emotional states. There is a latent lack in our knowledge of what we experience: an unknown. Massumi (2023) states that “Affect is not a personal feeling (…) Affect is a non-conscious experience of intensity” (Waller, 2023, par. 13).

This non-conscious intensity of experience is not unlike the visceral experience of the Unborn and its compassion; a bringing to deeper awareness and intensity of the sometimes rotten karmic rags that have become the trainee's knotted emotions.

This takes time to unfold.

These rags are unseen and experienced sometimes as suffering and disturbance. It is very hard and often unnecessary to know where this disturbance comes from, but it is essential to sit within the heart of it. It can feel unknown, awkward and unwanted. Like the suffering kesa rags of the nun who transforms them into the clothes of enlightenment.

It is her sewing together of the kesa, paralleled in the acceptance and embrace of these disparate rejected rags of self and other, which may bring together and unfold understanding and awareness over the nun's lifetime.

## The Kesa as a Representation of the Precepts

A traditional view of the kesa is that it represents the precepts, which are teachings of how to live skillfully, passed down to the disciple from the deep understanding ( kensho /enlightenment) of a Zen master.

The rags, living via the precepts, and enlightenment are seen as the same thing but must be fully absorbed to be understood as such.

Hence, the bodily intimacy and embrace of the nun who literally unfolds these precepts and suffering rags and wraps them around herself.

In this way, she takes refuge within the Unborn: a lotus flower cannot kill.

She has taken refuge in the precepts.

These rags of life have been affected across a fabric of other bodies unseen: transindividual, unconscious, in the body intensities, in unholy conversation from time immemorial and now the nun, having sewn them together, will attempt to make sense of them by letting go of them.

As Dogen (2007) wrote:

When one studies Buddhism, one studies oneself, when one studies oneself, one forgets oneself, when oneself forgets oneself one is enlightened by everything, and this very enlightenment breaks the bonds of clinging to both body and mind, not only for oneself but for all beings as well. (p. 206)

Just so, she wraps the rice paddy field around her. The whole earth becomes her refuge as she disappears into the Unborn and the sanctuary of the alterity of affects.

From unconditioned Unborn and without organs to conditioned body of refused, karmically-charged rags. Of these rags, which covered and absorbed the blood and excrement of others and of the land, she slowly, patiently makes a mandala flower. The affect of these rags brings help to those she prays with, seen and unseen, and all returns to the Unborn.

She has no idea what this seemingly autonomous other is but guards it well, or else all is lost and so begins a hell realm of nonsense.

## The Affective Therapeutic Encounter

The therapist will often visit this hell realm with his or her client.

In therapy, perhaps you and I—counsellor and client—are like the nun: far more than just these two. We are transindividual and come from the rags and the stench of the compost of many. We are imagined from a place of not knowing and invisible, non-conscious visceral intensities. Just for a while, the many affects of what is said and not said—evoked, suggested, felt in a change of temperature or atmosphere, and the felt texture of it, helpfully distracted by the weight of a passing comment or disturbing metaphor, which necessarily allays and helps the client forget an initial concern, which plummets the meeting to new depth, like the discordant rags of the kāṣāya —may be sewn together. Via Unborn exchange of speech and otherwise, a helpful turn of phrase or intervention may then be expressed before the autonomy of affect makes us thankfully lost for words again.

Indeed, it helps to forget the self. And silence is important.

Here we may feel discomfort in the room, or perhaps some peace.

As Massumi (2019) stated: “As with the autonomy of affects, meaning is as much in the gaps between the words as in the words themselves” (p. 115).

As the Buddha said, look outside the squares of the rice paddy field, see the fields become visible by the “strips, laid out with borders, laid out with cross-lines” (Hollenbeck, 2010, p. 2).

Alongside the rags of the kāṣāya is silence.

When the therapeutic encounter encourages silence—when we maybe helpfully forget what we wanted to say for a moment—a gap, a void appears, and we may be disturbed. To the point we may want to rush in and fill it. But let that gap speak for a while, feel the disturbance, and let the forgotten rags sing an unholy thought. Just the lip and curl of it is enough.

And then, as in art, when your eyes are deflected from the scrap and rash of the born image and meaning is sensed; so in therapy, when there is a virtual movement which spins off from the initial spoken words, and instead there is a felt, visceral, on-the-skin perception and cognition, then you are feeling the affective force of it. A moment of insight and enlightenment may arise.

The female monastic Rev. Master Jiyū (1993b) identifies wearing the kesa of the Unborn with her reason for living and says, just before she is given the Buddhist precepts:

My purpose for living is to be a monk (...) I have been a monk for many years but—what is a monk? My kesa is upon my head and the Lord of the House, That Which Is, pulls its corner. Yes, indeed, this is monkhood—to wear the kesa of the Lord; true ordination is to know what it is to be a monk. (p. 25)

In the intimacy of a therapeutic encounter, something, or someone, pulls at a corner of the scraps of affects; the lip and barnacled curl of it. The rest remains unseen, autonomous though implicit, in the intensity of perception of this unassertive wave and urgent scrap of life. Something pulls at a corner when the urgency promotes itself and the discarded and homeless becomes the whole of enlightenment and we are seen.

Just for a while, we understand.

This will carry a conceptually complex movement of thought and feeling that wants nothing more than to keep generating more concepts and affects, beyond where the author, the homeless monk, the transindividual counsellor/client’s insight stopped.

There is an affective potency and generative conversation, which has come from the rags of the Unborn—from nowhere—which moves towards the surplus … of always having more to say than knowing how to say it.

Trusting in this abundance, in these rags, we take a risk and jump. We transform the forgotten suffering, stitch it together, and feel the affect of love.

## References

- Laplanche, J. (1970). Life and Death in Psychoanalysis. Baltimore: Johns Hopkins University Press.
- Laplanche, J. (1999). Essays on Otherness. London: Routledge.
- Bazzano, M. (2019). Re-Visioning Person-Centred Therapy: Theory and Practice of a Radical Paradigm. London: Routledge.
- Suzuki, D. T. (1949). Zen Doctrine of No-Mind. London: Rider & Company.
- Nagao, G. (1991). Mādhyamika and Yogācāra. Albany: State University of New York Press.
- Bazzano, M. (2017). Buddhism and Psychotherapy: Across Cultures, Across Borders. London: Routledge.
- Keats, J. (1817). Letter to George and Thomas Keats, December 21, 1817. In: Rollins, H. E. (Ed.), The Letters of John Keats. Cambridge: Harvard University Press, 1958.
- Damasio, A. (1999). The Feeling of What Happens: Body and Emotion in the Making of Consciousness. New York: Harcourt Brace.
- Kabat-Zinn, J. (1990). Full Catastrophe Living: Using the Wisdom of Your Body and Mind to Face Stress, Pain, and Illness. New York: Delacorte`,
  },
]
