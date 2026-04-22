import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, TFile, TFolder, parseYaml } from 'obsidian';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const VIEW_TYPE_DASHBOARD = 'deleometer-dashboard';
const VIEW_TYPE_AI_CHAT = 'deleometer-ai-chat';
const MYERS_BRIGGS_PERSPECTIVE_KEY = 'myers_briggs_perspective';

interface PerspectiveGroup {
  title: string;
  description: string;
}

interface PerspectiveDefinition {
  title: string;
  description: string;
  group: string;
}

interface PerspectiveMetadata {
  tradition?: string;
  orientation?: string;
  lineage?: string;
  chronology?: string;
}

interface OutputLanguageOption {
  label: string;
  prompt: string;
}

const PHILOSOPHY_GROUP_KEY = 'philosophy_first_discipline';

const PERSPECTIVE_GROUPS: Record<string, PerspectiveGroup> = {
  [PHILOSOPHY_GROUP_KEY]: {
    title: 'Philosophy as First Discipline',
    description: 'First principles, being, ethics, mind, theology, and metaphysical orientation'
  },
  religious_mythic_interpretation: {
    title: 'Religious, Mythic, and Pagan Interpretations',
    description: 'Ancient religions, mythic patterns, sacred texts, ritual worlds, divinities, covenant, revelation, and comparative spiritual meaning'
  },
  social_spatial_research: {
    title: 'Social, Spatial, and Research Methods',
    description: 'Maps, places, social structures, institutions, fieldwork, evidence, positionality, and methods for studying lived worlds'
  },
  narrative_media_frame: {
    title: 'Narrative, Media, and Frame Studies',
    description: 'Language, signs, story, mediation, public presentation, framing, nonfiction practice, and interaction order'
  },
  psychoanalytic_clinical: {
    title: 'Psychoanalytic and Clinical Psychologies',
    description: 'Desire, attachment, symptom, personality, cognition, embodiment, and therapeutic interpretation'
  },
  family_care_guidance: {
    title: 'Family, Care, and Guidance Theories',
    description: 'Parenting, intergenerational care, kinship practice, family pedagogy, social expectation, guidance, and cultural formation'
  },
  archeo_genealogical_deconstruction: {
    title: 'Archeo-Genealogical and Deconstructive Thought',
    description: 'Power, discourse, difference, ideology, critique, and the recombination of inherited forms'
  },
  gender_sexuality_queer: {
    title: 'Gender, Sexuality, and Queer Studies',
    description: 'Gendered life, sexualities, lesbian and gay studies, trans studies, and queer norm critique'
  },
  race_coloniality_embodiment: {
    title: 'Race, Coloniality, and Embodiment Studies',
    description: 'Race, decoloniality, disability, madness, fatness, embodiment, and situated power'
  },
  systems_ecology_food: {
    title: 'Systems, Ecology, and Food Futures',
    description: 'Actor-networks, food systems, biomimicry, ecopoiesis, resilience, and ecological transition'
  },
  strategy_method_organisation: {
    title: 'Strategy, Method, and Organisation',
    description: 'Tactical method, risk, feasibility, SWOT, organisations, movements, and transformative futures'
  }
};

const PERSPECTIVES: Record<string, PerspectiveDefinition> = {
  indigenous_australian_philosophy_accumulated: { title: 'Australian Indigenous Philosophy Accumulated', description: 'Country, kinship, custodianship, relational law, story, ceremony, ecological obligation, sovereignty, survival, and living First Nations knowledge', group: PHILOSOPHY_GROUP_KEY },
  buddhist_psychology_perspective: { title: 'Buddhist Psychology', description: 'Mindfulness, suffering, and liberation', group: PHILOSOPHY_GROUP_KEY },
  platonic_perspective: { title: 'Platonic Philosophy', description: 'Forms, dialectic, eros, education, justice, and ascent toward truth', group: PHILOSOPHY_GROUP_KEY },
  aristotle_argonic_teachings: { title: "Aristotle's Argonic Teachings", description: 'Rhetoric, demonstration, causes, material conditions, practical judgment, virtue, persuasion, and action', group: PHILOSOPHY_GROUP_KEY },
  cynics_perspective: { title: "Cynics' Philosophy", description: 'Plain living, shameless truth-telling, social convention, need, freedom, and embodied critique', group: PHILOSOPHY_GROUP_KEY },
  stoicism_perspective: { title: 'Stoic Philosophy', description: 'Virtue, acceptance, and inner peace', group: PHILOSOPHY_GROUP_KEY },
  bible_teachings_perspective: { title: 'Bible Teachings', description: 'Wisdom, covenant, prophecy, parable, care, justice, and spiritual discernment', group: PHILOSOPHY_GROUP_KEY },
  metaphysical_analysis: { title: 'Metaphysical Analysis', description: 'Reality, causality, substance, possibility, identity, and ultimate commitments', group: PHILOSOPHY_GROUP_KEY },
  ontological_analysis: { title: 'Ontological Analysis', description: 'Modes of being, entities, relations, becoming, and existential structure', group: PHILOSOPHY_GROUP_KEY },
  ethical_analysis: { title: 'Ethical Analysis', description: 'Obligation, virtue, care, harm, responsibility, and practical judgment', group: PHILOSOPHY_GROUP_KEY },
  philosophy_of_mind_perspective: { title: 'Philosophy of Mind', description: 'Consciousness, intention, emotion, agency, selfhood, and mental causation', group: PHILOSOPHY_GROUP_KEY },
  descartes_cogito_subject: { title: "René Descartes' Cogito and Subject", description: 'Doubt, certainty, mind-body distinction, thinking substance, inwardness, rational selfhood, and the cogito as a ground of knowledge', group: PHILOSOPHY_GROUP_KEY },
  spinoza_theologic_ethico_perspective: { title: "Spinoza's Theologic-Ethico Philosophy", description: 'Immanence, affect, necessity, freedom, substance, and ethical life', group: PHILOSOPHY_GROUP_KEY },
  leibniz_monadology_perspective: { title: "Gottfried Wilhelm Leibniz's Monadology", description: 'Monads, pre-established harmony, sufficient reason, possible worlds, perception, appetite, relation, and rational order', group: PHILOSOPHY_GROUP_KEY },
  lockean_personal_identity: { title: "John Locke's Personal Identity", description: 'Consciousness, memory, personhood, accountability, continuity, moral responsibility, and the self over time', group: PHILOSOPHY_GROUP_KEY },
  humean_bundle_self: { title: "David Hume's Bundle Theory of Self", description: 'Impressions, perceptions, habit, continuity, skepticism, identity as fiction, and the self as a bundle of experiences', group: PHILOSOPHY_GROUP_KEY },
  rousseau_political_thought: { title: "Jean-Jacques Rousseau's Political Thought", description: 'General will, inequality, freedom, education, civic life, corruption, dependence, moral sentiment, and the making of political community', group: PHILOSOPHY_GROUP_KEY },
  aesthetics_untranslatables: { title: 'Aesthetics', description: 'Aisthesis, sensation, taste, beauty, art, the sensible, judgment, translation, and the contested history of what aesthetics is taken to mean', group: PHILOSOPHY_GROUP_KEY },
  moral_naturalism_perspective: { title: 'Moral Naturalism', description: 'Moral facts, natural properties, human flourishing, reasons, science, normativity, value, and ethical life without supernatural grounding', group: PHILOSOPHY_GROUP_KEY },
  kantian_transcendental_subject: { title: "Immanuel Kant's Transcendental Subject", description: 'Apperception, categories, autonomy, moral law, conditions of experience, and the self that organizes knowledge', group: PHILOSOPHY_GROUP_KEY },
  hegelian_recognition_subject: { title: "G.W.F. Hegel's Recognition and Subjectivity", description: 'Recognition, self-consciousness, lordship and bondage, dialectic, social freedom, history, and becoming a subject through others', group: PHILOSOPHY_GROUP_KEY },
  kierkegaard_existential_faith: { title: "Søren Kierkegaard's Existential Faith", description: 'Anxiety, despair, subjectivity, inwardness, choice, faith, repetition, the leap, and becoming a self before God and others', group: PHILOSOPHY_GROUP_KEY },
  schopenhauer_will_representation: { title: "Arthur Schopenhauer's Will and Representation", description: 'Will, suffering, desire, representation, compassion, pessimism, ascetic interruption, and the restless structure of experience', group: PHILOSOPHY_GROUP_KEY },
  nietzschean_perspective: { title: 'Nietzschean Philosophy', description: 'Will to power, values, and self-overcoming', group: PHILOSOPHY_GROUP_KEY },
  collingwood_historical_imagination: { title: "R. G. Collingwood's Historical Imagination", description: 'Re-enactment of thought, historical consciousness, question-and-answer logic, evidence, context, and understanding action from within its problem-space', group: PHILOSOPHY_GROUP_KEY },
  logics_analysis: { title: 'Logics Analysis', description: 'Inference, validity, contradiction, entailment, formal structure, argument patterns, and what follows from what', group: PHILOSOPHY_GROUP_KEY },
  epistemology_analysis: { title: 'Epistemology', description: 'Knowledge, belief, evidence, justification, error, testimony, certainty, ignorance, and the conditions under which a claim counts as known', group: PHILOSOPHY_GROUP_KEY },
  husserlian_phenomenology: { title: "Edmund Husserl's Phenomenology", description: 'Intentionality, epoché, reduction, evidence, lived experience, constitution, time-consciousness, and the structures of appearing', group: PHILOSOPHY_GROUP_KEY },
  phenomenology_perspective: { title: 'Phenomenology', description: 'Lived experience and consciousness', group: PHILOSOPHY_GROUP_KEY },
  heideggerian_dasein_analysis: { title: "Martin Heidegger's Dasein Analysis", description: 'Being-in-the-world, thrownness, care, everydayness, authenticity, temporality, and the self as situated existence', group: PHILOSOPHY_GROUP_KEY },
  levinasian_ethics: { title: "Emmanuel Levinas' Ethics of the Other", description: 'Face-to-face encounter, infinite responsibility, alterity, vulnerability, ethics before ontology, and the demand of the Other', group: PHILOSOPHY_GROUP_KEY },
  hermeneutics_perspective: { title: 'Hermeneutics', description: 'Interpretation and understanding', group: PHILOSOPHY_GROUP_KEY },
  existential_perspective: { title: 'Existential Analysis', description: 'Authenticity, freedom, and meaning', group: PHILOSOPHY_GROUP_KEY },
  sartrean_subjectivity: { title: "Jean-Paul Sartre's Subjectivity", description: 'Freedom, bad faith, nothingness, the look, responsibility, choice, and the self as project rather than essence', group: PHILOSOPHY_GROUP_KEY },
  de_beauvoir_situated_subject: { title: "Simone de Beauvoir's Situated Subject", description: 'Ambiguity, freedom, oppression, gendered becoming, immanence, transcendence, and the ethical demand to become with others', group: PHILOSOPHY_GROUP_KEY },
  merleau_ponty_embodied_subject: { title: "Maurice Merleau-Ponty's Embodied Subject", description: 'Embodiment, perception, habit, flesh, motor intentionality, intersubjectivity, and the lived body as subject', group: PHILOSOPHY_GROUP_KEY },
  feminist_philosophy: { title: 'Feminist Philosophy', description: 'Power, embodiment, knowledge, sex and gender, autonomy, care, justice, difference, critique, and the transformation of inherited philosophical problems', group: PHILOSOPHY_GROUP_KEY },
  whitehead_process_philosophy: { title: "Alfred North Whitehead's Process Philosophy", description: 'Actual occasions, process, relation, creativity, prehension, concrescence, novelty, and reality as event rather than static substance', group: PHILOSOPHY_GROUP_KEY },
  process_philosophical_analysis: { title: 'Process Philosophical Analysis', description: 'Becoming, relation, event, creativity, temporality, and emergent order', group: PHILOSOPHY_GROUP_KEY },
  vitalism_analysis: { title: 'Vitalism', description: 'Life force, organismic animation, irreducibility of living processes, growth, self-organization, formative powers, and the question of whether life exceeds mechanism', group: PHILOSOPHY_GROUP_KEY },
  organicism_analysis: { title: 'Organicism', description: 'Wholes, parts, development, interdependence, living systems, pattern, organization, and understanding entities through their relations within an organismic whole', group: PHILOSOPHY_GROUP_KEY },
  philosophy_of_language_analysis: { title: 'Philosophy of Language', description: 'Meaning, reference, naming, use, speech acts, interpretation, translation, rule-following, and how language shapes thought and worldhood', group: PHILOSOPHY_GROUP_KEY },
  wittgenstein_language_games: { title: "Ludwig Wittgenstein's Language Games", description: 'Use, rule-following, forms of life, language games, family resemblance, ordinary language, and the limits of what can be said clearly', group: PHILOSOPHY_GROUP_KEY },
  pf_strawson_personhood: { title: "P. F. Strawson's Personhood", description: 'Persons, reactive attitudes, responsibility, ordinary language, embodiment, mutual recognition, and the social grammar of accountability', group: PHILOSOPHY_GROUP_KEY },
  harry_frankfurt_volitional_self: { title: "Harry Frankfurt's Volitional Self", description: 'Second-order desires, wholeheartedness, identification, free will, care, ambivalence, and what a person wants to want', group: PHILOSOPHY_GROUP_KEY },
  sydney_shoemaker_self_knowledge: { title: "Sydney Shoemaker's Self-Knowledge", description: 'Self-reference, immunity to error, first-person authority, embodiment, memory, and how one knows oneself as oneself', group: PHILOSOPHY_GROUP_KEY },
  bernard_williams_personal_identity: { title: "Bernard Williams' Personal Identity", description: 'Bodily continuity, character, practical concern, thought experiments, fear, survival, and identity as lived from the first person', group: PHILOSOPHY_GROUP_KEY },
  paul_ricoeur_narrative_identity: { title: "Paul Ricoeur's Narrative Identity", description: 'Selfhood, sameness, narrative time, promise, memory, interpretation, and identity as the story one can answer for', group: PHILOSOPHY_GROUP_KEY },
  derek_parfit_reductionist_identity: { title: "Derek Parfit's Reductionist Identity", description: 'Psychological continuity, connectedness, survival, reductionism, relation R, and why identity may matter less than we think', group: PHILOSOPHY_GROUP_KEY },
  habermasian_communicative_subject: { title: "Jürgen Habermas' Communicative Subject", description: 'Communicative action, discourse ethics, public reason, validity claims, lifeworld, recognition, and subjectivity formed through dialogue', group: PHILOSOPHY_GROUP_KEY },
  charles_taylor_sources_self: { title: "Charles Taylor's Sources of the Self", description: 'Moral horizons, strong evaluation, authenticity, recognition, modern identity, and the goods that orient selfhood', group: PHILOSOPHY_GROUP_KEY },
  macintyre_narrative_self: { title: "Alasdair MacIntyre's Narrative Self", description: 'Virtue, tradition, practices, narrative unity, intelligibility, moral agency, and a life understood as an unfolding story', group: PHILOSOPHY_GROUP_KEY },
  jean_luc_nancy_being_with: { title: "Jean-Luc Nancy's Being-With", description: 'Being singular plural, exposure, community, finitude, co-existence, touch, spacing, and the self as always with others', group: PHILOSOPHY_GROUP_KEY },
  judith_butler_performativity: { title: "Judith Butler's Performativity and Subjectivation", description: 'Performativity, norms, recognizability, gendered subject formation, repetition, vulnerability, and livable life', group: PHILOSOPHY_GROUP_KEY },
  catriona_mackenzie_relational_autonomy: { title: "Catriona Mackenzie's Relational Autonomy", description: 'Autonomy, vulnerability, self-trust, social recognition, agency, relational support, and how conditions enable or block self-direction', group: PHILOSOPHY_GROUP_KEY },
  christine_korsgaard_self_constitution: { title: "Christine Korsgaard's Self-Constitution", description: 'Practical identity, agency, normativity, action, self-legislation, integrity, and making oneself through commitments', group: PHILOSOPHY_GROUP_KEY },
  marya_schechtman_narrative_self: { title: "Marya Schechtman's Narrative Self", description: 'Person-life view, narrative identity, characterization, memory, social uptake, and what makes a life intelligibly one life', group: PHILOSOPHY_GROUP_KEY },
  linda_alcoff_visible_identities: { title: "Linda Martín Alcoff's Visible Identities", description: 'Embodied identity, race, gender, social location, visibility, experience, and how selves are politically interpreted', group: PHILOSOPHY_GROUP_KEY },
  anthony_appiah_identity_ethics: { title: "Kwame Anthony Appiah's Identity Ethics", description: 'Social scripts, individuality, honor, recognition, cosmopolitanism, collective identity, and ethical self-fashioning', group: PHILOSOPHY_GROUP_KEY },
  adriana_cavarero_relational_uniqueness: { title: "Adriana Cavarero's Relational Uniqueness", description: 'Narratable self, uniqueness, voice, exposure, relationality, birth, and the who that appears through others', group: PHILOSOPHY_GROUP_KEY },
  dan_zahavi_minimal_self: { title: "Dan Zahavi's Minimal Self", description: 'First-person givenness, pre-reflective self-awareness, phenomenology, embodiment, selfhood, and the minimal structure of experience', group: PHILOSOPHY_GROUP_KEY },
  shaun_gallagher_embodied_self: { title: "Shaun Gallagher's Embodied Self", description: 'Body schema, agency, ownership, intersubjectivity, cognition, enactivism, and the self as embodied action', group: PHILOSOPHY_GROUP_KEY },
  gallagher_pattern_theory_self: { title: "Shaun Gallagher's Pattern Theory of Self", description: 'Self-pattern, embodied, experiential, affective, intersubjective, narrative, extended, ecological, and normative dimensions of selfhood as a dynamic configuration', group: PHILOSOPHY_GROUP_KEY },
  rosi_braidotti_nomadic_subjectivity: { title: "Rosi Braidotti's Nomadic Subjectivity", description: 'Nomadic subject, posthuman feminism, becoming, embodiment, difference, affirmative ethics, and non-unitary selfhood', group: PHILOSOPHY_GROUP_KEY },
  naturalism_analysis: { title: 'Naturalism', description: 'Nature, lawfulness, continuity, explanation, anti-supernaturalism, human embeddedness, and what it means to explain life and mind without transcendence', group: PHILOSOPHY_GROUP_KEY },
  philosophy_of_science_analysis: { title: 'Philosophy of Science', description: 'Explanation, theory choice, evidence, experiment, models, realism, falsifiability, underdetermination, and the making of scientific knowledge', group: PHILOSOPHY_GROUP_KEY },
  philosophy_of_physics_analysis: { title: 'Philosophy of Physics', description: 'Space, time, matter, causation, laws, fields, measurement, scale, and how physical theory frames reality', group: PHILOSOPHY_GROUP_KEY },
  feyerabend_epistemological_anarchism: { title: "Paul Feyerabend's Epistemological Anarchism", description: 'Methodological pluralism, epistemic dissent, against rigid method, scientific change, heterodoxy, and the politics of knowledge-making', group: PHILOSOPHY_GROUP_KEY },
  michel_serres_relations: { title: "Michel Serres' Relations and Parasites", description: 'Noise, parasitism, relation, passage, communication, mediation, contamination, and how systems are transformed by interference', group: PHILOSOPHY_GROUP_KEY },
  jacques_ranciere_politics_aesthetics: { title: "Jacques Rancière's Politics and Aesthetics", description: 'The distribution of the sensible, dissensus, equality, politics, aesthetics, voice, partition, and who gets to appear and be heard', group: PHILOSOPHY_GROUP_KEY },
  topological_analysis: { title: 'Topological Analysis', description: 'Relations, surfaces, thresholds, folds, nearness, boundaries, and spatial transformations of meaning', group: PHILOSOPHY_GROUP_KEY },

  ancient_religious_interpretation: { title: 'Ancient Religious Interpretation', description: 'Ritual, sacrifice, omen, sacred order, taboo, ancestor, cosmology, and ancient religious imagination', group: 'religious_mythic_interpretation' },
  ancient_egyptian_interpretation: { title: 'Ancient Egyptian Interpretation', description: "Ma'at, ka, ba, divine kingship, the afterlife, ritual order, cosmic balance, sacred writing, temple worlds, and the moral-spiritual weight of action", group: 'religious_mythic_interpretation' },
  first_testament_hebrew_interpretation: { title: 'First Testament / Hebrew Interpretation', description: 'Covenant, law, prophecy, lament, wisdom, exile, justice, creation, and faithful argument with God', group: 'religious_mythic_interpretation' },
  greek_gods_interpretation: { title: 'Greek Gods Interpretation', description: 'Olympian powers, mythic archetypes, fate, hubris, patronage, conflict, desire, and heroic consequence', group: 'religious_mythic_interpretation' },
  roman_gods_interpretation: { title: 'Roman Gods Interpretation', description: 'Civic religion, household gods, pietas, omen, duty, empire, ritual order, and public virtue', group: 'religious_mythic_interpretation' },
  druidic_interpretation: { title: 'Druidic Interpretation', description: 'Oral wisdom, trees, land memory, bardic speech, seasonal rites, kinship, sovereignty, and ecological divination', group: 'religious_mythic_interpretation' },
  second_testament_christian_interpretation: { title: 'Second Testament / Christian Interpretation', description: 'Gospel, parable, grace, discipleship, incarnation, forgiveness, community, resurrection, and ethical transformation', group: 'religious_mythic_interpretation' },
  muslim_interpretation: { title: 'Muslim Interpretation', description: 'Tawhid, submission, mercy, intention, justice, prayer, ummah, prophetic example, and disciplined remembrance', group: 'religious_mythic_interpretation' },
  pagan_interpretation: { title: 'Pagan Interpretation', description: 'Seasonal cycles, polytheism, land, animacy, ritual practice, reciprocity, craft, and embodied sacred life', group: 'religious_mythic_interpretation' },

  cartographic_analysis: { title: 'Cartographic Analysis', description: 'Maps, scale, projection, legend, boundary-making, orientation, territory, omission, routes, and how mapping turns experience into spatial knowledge', group: 'social_spatial_research' },
  geography_analysis: { title: 'Geography', description: 'Place, space, landscape, region, mobility, environment, human geography, physical geography, uneven development, and relations between people and land', group: 'social_spatial_research' },
  sociology_analysis: { title: 'Sociology', description: 'Social structure, institutions, norms, class, status, roles, groups, interaction, social change, power, and the patterning of everyday life', group: 'social_spatial_research' },
  social_theories_of_deviance: { title: 'Social Theories of Deviance', description: 'Norm violation, labeling, stigma, moral panic, social control, subculture, anomie, criminalization, and how societies define and manage deviance', group: 'social_spatial_research' },
  discourse_analysis: { title: 'Discourse Analysis', description: 'Speech, text, framing, repetition, genre, institutional language, positioning, rhetoric, and how discourse shapes what can be thought and said', group: 'social_spatial_research' },
  political_thought: { title: 'Political Thought', description: 'Authority, legitimacy, liberty, power, conflict, order, justice, obligation, and the ideas that shape collective life', group: 'social_spatial_research' },
  democracy_analysis: { title: 'Democracy', description: 'Representation, participation, equality, deliberation, institutions, dissent, citizenship, accountability, and collective decision-making', group: 'social_spatial_research' },
  theories_of_world_politics: { title: 'Theories of World Politics', description: 'International order, sovereignty, realism, liberalism, imperialism, interdependence, geopolitics, security, and global power relations', group: 'social_spatial_research' },
  critique_of_human_rights: { title: 'Critique of Human Rights', description: 'Rights discourse, universality, exclusion, state power, humanitarianism, enforcement gaps, abstraction, and the politics of legal moral claims', group: 'social_spatial_research' },
  social_policy_analysis: { title: 'Social Policy', description: 'Welfare, care, public provision, inequality, redistribution, institutions, safety nets, governance, and policy impacts on everyday life', group: 'social_spatial_research' },
  healthy_in_all_policies: { title: 'Health in All Policies for Healthy Communities', description: 'Public health across sectors, prevention, equity, housing, transport, food, community wellbeing, interdepartmental policy, and healthy environments', group: 'social_spatial_research' },
  social_research_methods: { title: 'Social Research Methods', description: 'Research questions, interviews, observation, surveys, sampling, ethics, coding, reflexivity, validity, positionality, and evidence-building in social inquiry', group: 'social_spatial_research' },

  linguistic_analysis: { title: 'Linguistic Analysis', description: 'Words, grammar, naming, register, metaphor, speech acts, code-switching, silence, and how language organizes experience', group: 'narrative_media_frame' },
  semiotic_analysis: { title: 'Semiotic Analysis', description: 'Signs, symbols, signifier and signified, codes, icons, indexes, myths, and how meaning is made and circulated', group: 'narrative_media_frame' },
  argumentation_construction_analysis: { title: 'Argumentation Construction and Analysis', description: 'Claims, warrants, evidence, assumptions, validity, rhetoric, counterargument, inference, and how arguments are built and tested', group: 'narrative_media_frame' },
  narrative_psychology_perspective: { title: 'Narrative Psychology', description: 'Life stories and meaning-making', group: 'narrative_media_frame' },
  creative_nonfiction_perspective: { title: 'Creative Non-Fiction', description: 'Scene, voice, witness, memory, essaying, and truthful narrative craft', group: 'narrative_media_frame' },
  music_songwriting_analysis: { title: 'Music Songwriting Analysis', description: 'Melody, lyric, rhythm, refrain, hook, voice, affect, arrangement, genre, performance, and how songs turn feeling into form', group: 'narrative_media_frame' },
  idiotextual_analysis: { title: 'Idiotextual Analysis', description: 'The singular texture of a text: idiosyncratic voice, private idiom, recurring phrases, and self-made meanings', group: 'narrative_media_frame' },
  frame_analysis: { title: 'Frame Analysis', description: 'Interpretive frames, salience, boundaries, alignment, and meaning organization', group: 'narrative_media_frame' },
  goffman_frame_analysis: { title: "Erving Goffman's Frame Analysis", description: 'Interaction order, presentation of self, keyed events, footing, and everyday frames', group: 'narrative_media_frame' },
  media_studies: { title: 'Media Studies', description: 'Platforms, mediation, publics, representation, attention, circulation, and media power', group: 'narrative_media_frame' },
  poetics_analysis: { title: 'Poetics', description: 'Image, rhythm, metaphor, sound, line, voice, form, compression, resonance, and how language becomes patterned intensity', group: 'narrative_media_frame' },
  art_theory_analysis: { title: 'Art Theory', description: 'Medium, form, spectatorship, representation, aesthetic judgment, interpretation, image politics, craft, and the work of art in culture', group: 'narrative_media_frame' },
  susan_sontag_interpretation: { title: "Susan Sontag on Interpretation", description: 'Against over-interpretation, style, sensuous surface, camp, image culture, illness metaphors, and the ethics of looking and reading', group: 'narrative_media_frame' },
  tessa_laird_cinemal: { title: "Tessa Laird's Cinemal", description: 'Becoming-animal experimental film, sensory cinema, nonhuman perception, more-than-human voices, ecological collapse, and cinematic animality', group: 'narrative_media_frame' },

  freudian_psychoanalysis: { title: 'Freudian Psychoanalysis', description: 'Unconscious conflict, repression, dream-work, sexuality, and symptom formation', group: 'psychoanalytic_clinical' },
  jungian_perspective: { title: 'Jungian Analysis', description: 'Archetypes, shadow, and individuation', group: 'psychoanalytic_clinical' },
  lacanian_perspective: { title: 'Lacanian Psychoanalysis', description: 'Analysis through desire, the Other, and symbolic order', group: 'psychoanalytic_clinical' },
  kristevan_abjection_semiotic: { title: "Julia Kristeva's Abjection and Semiotic", description: 'Abjection, the semiotic and symbolic, maternal body, borders of self, revolt, intertextuality, foreignness, and subject formation through language and affect', group: 'psychoanalytic_clinical' },
  psychiatry_perspective: { title: 'Psychiatric Assessment', description: 'Clinical patterns and mental health', group: 'psychoanalytic_clinical' },
  attachment_theory_perspective: { title: 'Attachment Theory', description: 'Attachment styles and relational patterns', group: 'psychoanalytic_clinical' },
  gestalt_perspective: { title: 'Gestalt Therapy', description: 'Awareness, wholeness, and present experience', group: 'psychoanalytic_clinical' },
  transpersonal_perspective: { title: 'Transpersonal Psychology', description: 'Spiritual dimensions and peak experiences', group: 'psychoanalytic_clinical' },
  maslow_hierarchy_needs: { title: "Maslow's Hierarchy of Needs", description: 'Physiological needs, safety, belonging, esteem, self-actualization, motivation, deprivation, growth, and the conditions that support human flourishing', group: 'psychoanalytic_clinical' },
  [MYERS_BRIGGS_PERSPECTIVE_KEY]: {
    title: 'Myers-Briggs analysis',
    description: 'Personality preferences across introversion/extraversion, sensing/intuition, thinking/feeling, and judging/perceiving',
    group: 'psychoanalytic_clinical'
  },
  cbt_perspective: { title: 'Cognitive Behavioral', description: 'Thoughts, behaviors, and patterns', group: 'psychoanalytic_clinical' },
  positive_psychology_perspective: { title: 'Positive Psychology', description: 'Strengths, flourishing, and well-being', group: 'psychoanalytic_clinical' },

  montessori_method: { title: 'Montessori Method', description: 'Prepared environment, self-directed activity, sensitive periods, observation, independence, practical life, embodied learning, and respect for the child', group: 'family_care_guidance' },
  steiner_education: { title: 'Steiner Education', description: 'Waldorf pedagogy, imagination, rhythm, developmental stages, artistic learning, practical activity, holistic education, and teaching the child as body, soul, and spirit', group: 'family_care_guidance' },
  piaget_developmental_theory: { title: "Jean Piaget's Developmental Theory", description: 'Schemas, assimilation, accommodation, stages of cognitive development, constructivism, play, reasoning, and how children build knowledge', group: 'family_care_guidance' },
  vygotsky_sociocultural_theory: { title: "Lev Vygotsky's Sociocultural Theory", description: 'Zone of proximal development, scaffolding, language, social learning, cultural tools, mediation, collaboration, and guided development', group: 'family_care_guidance' },
  primary_pedagogy: { title: 'Teaching in Primary School', description: 'Foundational learning, play, scaffolding, safety, routine, literacy, numeracy, care, explanation, and teaching for early developmental stages', group: 'family_care_guidance' },
  secondary_pedagogy: { title: 'Teaching in Secondary School', description: 'Adolescence, identity formation, discipline, motivation, curriculum, peer culture, assessment, transition, and guided independence', group: 'family_care_guidance' },
  tertiary_pedagogy: { title: 'Teaching in Tertiary Education', description: 'Advanced study, disciplinary method, critical thinking, self-direction, research literacy, academic formation, transition, and adult learning', group: 'family_care_guidance' },
  trades_pedagogy: { title: 'Trades Pedagogy', description: 'Apprenticeship, practical competence, tacit knowledge, repetition, safety, embodied skill, tools, mentoring, and learning through doing', group: 'family_care_guidance' },
  asian_japanese_parental_guidance: { title: 'Asian / Japanese Parental Guidance Practices', description: 'Interdependence, family obligation, amae, discipline, social harmony, education, respect, and relational guidance in Japanese and wider Asian contexts', group: 'family_care_guidance' },
  african_zimbabwean_parental_guidance: { title: 'African / Zimbabwean Parental Guidance Practices', description: 'Ubuntu, extended kinship, respect, communal responsibility, oral teaching, discipline, survival, and intergenerational guidance in Zimbabwean and wider African contexts', group: 'family_care_guidance' },
  western_parental_guidance: { title: 'Western Parental Guidance Theories', description: 'Attachment, autonomy, authoritative guidance, boundaries, praise, discipline, rights, developmental milestones, and individual self-formation', group: 'family_care_guidance' },
  advice_from_grandma: { title: 'Advice from Grandma', description: 'Intergenerational wisdom, practical care, household knowledge, caution, humour, memory, everyday ethics, relational guidance, and lived common sense', group: 'family_care_guidance' },

  marxian_analysis: { title: 'Marx and Engels Historical Materialism', description: 'Class, labor, alienation, material conditions, ideology, commodity form, exploitation, social reproduction, historical materialism, and revolutionary change', group: 'archeo_genealogical_deconstruction' },
  post_structuralism_analysis: { title: 'Post-Structuralism', description: 'Difference, discourse, instability, subject formation, signifying chains, power, critique of fixed meaning, and the undoing of essential categories', group: 'archeo_genealogical_deconstruction' },
  bataillean_analysis: { title: 'Georges Bataillean Analysis', description: 'Excess, expenditure, transgression, sovereignty, taboo, sacrifice, eroticism, base materialism, and the limits of utility', group: 'archeo_genealogical_deconstruction' },
  critical_theory_perspective: { title: 'Critical Theory', description: 'Social critique and emancipation', group: 'archeo_genealogical_deconstruction' },
  horkheimer_critical_theory: { title: "Max Horkheimer's Critical Theory", description: 'Instrumental reason, domination, emancipation, ideology, capitalism, culture, authoritarian tendencies, and critique aimed at social transformation', group: 'archeo_genealogical_deconstruction' },
  simondonian_analysis: { title: 'Simondonian Analysis', description: 'Individuation, preindividual fields, technics, relation, and collective becoming', group: 'archeo_genealogical_deconstruction' },
  foucaultian_analysis: { title: 'Foucaultian Analysis', description: 'Power, discourse, discipline, subject formation, and historical conditions of truth', group: 'archeo_genealogical_deconstruction' },
  derridian_analysis: { title: 'Derridian Analysis', description: 'Deconstruction, differance, trace, supplement, undecidability, and textual instability', group: 'archeo_genealogical_deconstruction' },
  schizoanalytic_insights: { title: 'Deleuzian Schizoanalysis', description: 'Rhizomatic thinking, lines of flight, and becoming', group: 'archeo_genealogical_deconstruction' },
  zizekian_analysis: { title: 'Žižekian Analysis', description: 'Ideology, fantasy, contradiction, enjoyment, subjectivity, and the Real', group: 'archeo_genealogical_deconstruction' },
  spivak_subaltern_analysis: { title: "Gayatri Chakravorty Spivak's Subaltern Analysis", description: 'Subalternity, representation, epistemic violence, strategic essentialism, imperialism, translation, voice, mediation, and who can speak within dominant discourse', group: 'archeo_genealogical_deconstruction' },
  posthumanism_perspective: { title: 'Posthumanism', description: 'Beyond human-centered thinking', group: 'archeo_genealogical_deconstruction' },

  feminist_perspective: { title: 'Feminist Psychology', description: 'Gender, power, and social context', group: 'gender_sexuality_queer' },
  irigarayian_perspective: { title: 'Irigarayian Feminine', description: 'Sexual difference and feminine subjectivity', group: 'gender_sexuality_queer' },
  standpoint_theory: { title: 'Standpoint Theory', description: 'Situated social location, epistemic privilege from the margins, structural position, reflexivity, power, experience, and standpoint as a method of knowledge', group: 'gender_sexuality_queer' },
  radical_feminism: { title: 'Radical Feminism', description: 'Patriarchy, sex-class, violence, reproductive politics, structural domination, consciousness-raising, and transformative critique of male power', group: 'gender_sexuality_queer' },
  ecofeminism: { title: 'Ecofeminism', description: 'Gendered domination, ecology, care, extraction, embodiment, environmental justice, relational ethics, and the linked critique of patriarchy and ecological destruction', group: 'gender_sexuality_queer' },
  lgbtq_studies_perspective: { title: 'Lesbian & Gay Studies', description: 'Lesbian and gay histories, cultures, communities, marginalization, resilience, and affirmation', group: 'gender_sexuality_queer' },
  sexualities_studies: { title: 'Sexualities Studies', description: 'Sexual cultures, practices, identities, norms, pleasure, stigma, and social regulation', group: 'gender_sexuality_queer' },
  gender_studies: { title: 'Gender Studies', description: 'Gender systems, identities, embodiment, institutions, power, and everyday life', group: 'gender_sexuality_queer' },
  queer_theory_perspective: { title: 'Queer Theory', description: 'Norms, identity, fluidity, and the politics of desire', group: 'gender_sexuality_queer' },
  bell_hooks_love_pedagogy: { title: "bell hooks' Love and Pedagogy", description: 'Love as ethic, engaged pedagogy, domination, liberation, community, care, voice, feminist teaching, and transforming everyday life through critical relation', group: 'gender_sexuality_queer' },
  trans_studies: { title: 'Trans Studies', description: 'Trans life, embodiment, transition, self-determination, institutions, and gender variance', group: 'gender_sexuality_queer' },
  identity_politics_analysis: { title: 'Identity Politics', description: 'Collective identification, recognition, coalition, difference, strategic naming, inclusion, exclusion, representation, and the politics of belonging', group: 'gender_sexuality_queer' },
  elizabeth_grosz_corporeal_feminism: { title: "Elizabeth Grosz's Corporeal Feminism", description: 'Embodiment, sexual difference, becoming, materiality, time, space, animality, and feminist philosophy beyond static identity', group: 'gender_sexuality_queer' },
  donna_haraway_situated_knowledges: { title: "Donna Haraway's Situated Knowledges", description: 'Situated knowledge, partial perspective, cyborgs, technoscience, kin-making, response-ability, species entanglement, and accountable positioning', group: 'gender_sexuality_queer' },

  critical_race_studies: { title: 'Critical Race Studies', description: 'Racial formation, structural racism, intersectionality, law, culture, and lived experience', group: 'race_coloniality_embodiment' },
  fanonian_analysis: { title: 'Frantz Fanonian Analysis', description: 'Colonial violence, racialization, alienation, recognition, embodiment, national consciousness, liberation, and the psychic life of colonial power', group: 'race_coloniality_embodiment' },
  decolonial_studies: { title: 'Decolonial Studies', description: 'Coloniality, land, knowledge, sovereignty, extraction, repair, and pluriversal futures', group: 'race_coloniality_embodiment' },
  crip_studies: { title: 'Crip Studies', description: 'Crip politics, disability culture, anti-ableism, interdependence, access, embodiment, norm critique, refusal of compulsory capacity, and reimagining flourishing beyond able-bodied standards', group: 'race_coloniality_embodiment' },
  fat_studies: { title: 'Fat Studies', description: 'Anti-fat bias, embodiment, health norms, stigma, access, and fat liberation', group: 'race_coloniality_embodiment' },
  mad_studies: { title: 'Mad Studies', description: 'Psychiatric power, mad knowledge, distress, survival, and alternatives to pathologization', group: 'race_coloniality_embodiment' },

  ecology_perspective: { title: 'Ecology', description: 'Organisms, habitats, interdependence, niches, energy flows, disturbance, adaptation, and relations between living systems and environments', group: 'systems_ecology_food' },
  traditional_ecological_knowledges: { title: 'Traditional Ecological Knowledges', description: 'Long-term ecological observation, seasonal knowledge, custodianship, species relation, practice-based environmental learning, place memory, reciprocity, and intergenerational survival knowledge', group: 'systems_ecology_food' },
  quantum_theory_analysis: { title: 'Quantum Theory Analysis', description: 'Observation, indeterminacy, probability, entanglement, measurement, fields, scale, uncertainty, and the limits of classical causality', group: 'systems_ecology_food' },
  chaos_theory_analysis: { title: 'Chaos Theory', description: 'Nonlinearity, sensitivity to initial conditions, strange attractors, turbulence, emergence, unpredictability, pattern, and dynamic systems near instability', group: 'systems_ecology_food' },
  gregory_bateson_ecology_mind: { title: "Gregory Bateson's Ecology of Mind", description: 'Cybernetics, feedback, pattern, communication, double bind, learning levels, mind-in-system, relational ecology, and the pattern that connects', group: 'systems_ecology_food' },
  science_technology_studies: { title: 'Science and Technology Studies', description: 'Technoscience, laboratories, infrastructures, social construction, expertise, controversy, publics, material practice, and how science and technology are made in society', group: 'systems_ecology_food' },
  latourian_analysis: { title: 'Latourian Analysis', description: 'Actor-networks, mediation, translation, nonhuman agency, and assembled realities', group: 'systems_ecology_food' },
  karen_barad_agential_realism: { title: "Karen Barad's Agential Realism", description: 'Intra-action, apparatus, diffraction, mattering, entanglement, ethics, material-discursive practice, and quantum feminist theory', group: 'systems_ecology_food' },
  isabelle_stengers_cosmopolitics: { title: "Isabelle Stengers' Cosmopolitics", description: 'Cosmopolitics, ecology of practices, slowing down reasoning, speculative pragmatics, obligation, situated knowledge, and composing with heterogeneous worlds', group: 'systems_ecology_food' },
  new_materialisms: { title: 'New Materialisms', description: 'Matter, agency, relation, vitality, embodiment, assemblage, nonhuman force, material-discursive practice, and the liveliness of the world', group: 'systems_ecology_food' },
  resilience_analysis: { title: 'Resilience', description: 'Adaptive capacity, recovery, redundancy, stress response, and durable support systems', group: 'systems_ecology_food' },
  social_ecological_systems_theory: { title: 'Social-Ecological Systems Theory', description: 'Linked human and ecological systems, feedback loops, thresholds, adaptive governance, resilience, institutions, and environmental change', group: 'systems_ecology_food' },
  critical_food_systems_analysis: { title: 'Critical Food Systems Analysis', description: 'Food justice, supply chains, agriculture, labor, ecology, access, and power', group: 'systems_ecology_food' },
  feminist_food_studies: { title: 'Feminist Food Studies', description: 'Care, labor, eating, embodiment, domesticity, agriculture, consumption, food justice, gendered power, and the politics of nourishment', group: 'systems_ecology_food' },
  biomimicry_perspective: { title: 'Biomimicry', description: 'Learning from living systems, adaptation, form, function, and regenerative design', group: 'systems_ecology_food' },
  environmental_humanities: { title: 'Environmental Humanities', description: 'Culture, ecology, ethics, story, extinction, more-than-human worlds, environmental justice, and how human meaning is entangled with damaged environments', group: 'systems_ecology_food' },
  ecopoiesis_perspective: { title: 'Ecopoiesis', description: 'World-making ecologies, habitat creation, planetary repair, and life-supporting systems', group: 'systems_ecology_food' },
  rewilding_analysis: { title: 'Rewilding', description: 'Ecological restoration, trophic complexity, habitat recovery, nonhuman autonomy, corridor thinking, repair, and allowing damaged systems to regenerate beyond control', group: 'systems_ecology_food' },
  regenerative_design: { title: 'Regenerative Design', description: 'Whole-systems design, reciprocity, circularity, repair, living systems, long-term flourishing, ecological health, and design that restores rather than merely sustains', group: 'systems_ecology_food' },
  permaculture: { title: 'Permaculture', description: 'Earth care, people care, fair share, zones, stacking functions, regenerative practice, ecological design, and practical systems for resilient living', group: 'systems_ecology_food' },
  landscape_design_theory: { title: 'Theory of Landscape Design', description: 'Site, contour, planting, circulation, ecology, aesthetics, maintenance, public use, atmosphere, and designing relations between bodies and land', group: 'systems_ecology_food' },
  reciprocity_mutual_aid: { title: 'Reciprocity, Mutual Aid, and Sharing Economies', description: 'Reciprocity, commons, mutual aid, solidarity, gifting, sharing economies, survival networks, redistribution, and practical forms of collective support', group: 'systems_ecology_food' },
  jasper_hoffmeyer_biosemiotics: { title: "Jesper Hoffmeyer's Biosemiotics", description: 'Sign processes in living systems, code duality, semiosis, communication, organism-environment relation, meaning in life processes, and ecological signification', group: 'systems_ecology_food' },

  mechanical_engineering_analysis: { title: 'Mechanical Engineering Analysis', description: 'Forces, loads, constraints, materials, mechanisms, tolerances, failure modes, energy transfer, friction, maintenance, and practical design', group: 'strategy_method_organisation' },
  computer_science_analysis: { title: 'Computer Science', description: 'Algorithms, abstraction, data structures, computation, complexity, logic, interfaces, systems, debugging, and how procedures shape outcomes', group: 'strategy_method_organisation' },
  data_science_analysis: { title: 'Data Science', description: 'Data collection, cleaning, patterning, modeling, prediction, bias, metrics, visualization, uncertainty, and what gets counted as signal', group: 'strategy_method_organisation' },
  metascience_analysis: { title: 'Metascience', description: 'Research quality, reproducibility, incentives, publication bias, methods review, evidence standards, scientific institutions, and the study of how science works', group: 'strategy_method_organisation' },
  australian_legal_discourse: { title: 'Australian Legal Discourse', description: 'Common law, statute, precedent, jurisdiction, rights, obligations, evidence, administrative language, settler legality, and institutional reasoning in Australia', group: 'strategy_method_organisation' },
  swot_analysis: { title: 'SWOT Analysis', description: 'Strengths, weaknesses, opportunities, threats, and strategic positioning', group: 'strategy_method_organisation' },
  grounded_theory: { title: 'Grounded Theory', description: 'Open coding, constant comparison, memos, categories, theoretical sampling, emergence, saturation, and theory built from lived data', group: 'strategy_method_organisation' },
  autoethnography: { title: 'Autoethnography', description: 'Personal experience as cultural evidence, reflexive voice, situated memory, vulnerability, ethics, embodiment, and social interpretation', group: 'strategy_method_organisation' },
  feasibility_analysis: { title: 'Feasibility Analysis', description: 'Practical viability, resources, constraints, dependencies, costs, and implementation readiness', group: 'strategy_method_organisation' },
  risk_analysis: { title: 'Risk Analysis', description: 'Likelihood, impact, uncertainty, exposure, prevention, mitigation, and contingency', group: 'strategy_method_organisation' },
  transitional_theory: { title: 'Transitional Theory', description: 'Liminal movement, phased change, rites of passage, continuity, and transformation', group: 'strategy_method_organisation' },
  socio_technical_transitions_mlp: { title: 'Socio-Technical Transitions and the Multi-Level Perspective', description: 'Niches, regimes, landscape pressures, transition pathways, socio-technical change, sustainability transitions, system lock-in, and long-term transformation', group: 'strategy_method_organisation' },
  organisational_theories: { title: 'Organisational Theories', description: 'Structures, culture, governance, roles, incentives, coordination, and institutional change', group: 'strategy_method_organisation' },
  organisational_transformation: { title: 'Organisational Transformation', description: 'Change processes, leadership, culture shift, stakeholder alignment, resistance, capability building, implementation, and sustained institutional renewal', group: 'strategy_method_organisation' },
  social_movement_theories: { title: 'Theories Growing a Social Movement', description: 'Collective action, mobilization, framing, resources, leadership, and movement ecology', group: 'strategy_method_organisation' },
  andre_baier_tins_d_analysis: { title: "André Baier's TINS_D Analysis", description: 'Democracy education, sustainability, socio-technical responsibility, engineering ethics, participatory formation, critical reflection, and collective capability-building for ecological futures', group: 'strategy_method_organisation' },
  tacktical_methodological_analysis: { title: 'Tacktical Methodological Analysis', description: "Louisa Bufardeci's tactical method, situated procedure, constraints, mapping, and action", group: 'strategy_method_organisation' },
  transformative_futures: { title: 'Imagining Transformative Futures', description: 'Speculation, prefiguration, scenario imagination, world-building, and emancipatory possibility', group: 'strategy_method_organisation' }
};

const PERSPECTIVE_HEADING_ALIASES: Record<string, string[]> = {
  marxian_analysis: ['Marxian Analysis', 'Marx and Engels Historical Materialism', 'Marx and Engels', 'Marx and Engels Perspective'],
  lgbtq_studies_perspective: ['LGBTQ+ Studies'],
  feasibility_analysis: ['Feasability Analysis'],
  tacktical_methodological_analysis: ['Tactical Methodological Analysis'],
  maslow_hierarchy_needs: ["Marlow's Hierarchy of Needs", "Maslow's Hierarchy of Human Needs"],
  descartes_cogito_subject: ["Rene Descartes' Cogito and Subject"],
  bernard_williams_personal_identity: ["Barnard Williams' Personal Identity", 'Barnard Williams Personal Identity'],
  pf_strawson_personhood: ["P.F. Strawson's Personhood", "PF Strawson's Personhood"],
  leibniz_monadology_perspective: ["Leibniz's Monadology", 'Leibniz'],
  levinasian_ethics: ["Levinas' Ethics of the Other", 'Levinasian Ethics'],
  habermasian_communicative_subject: ["Habermas' Communicative Subject", 'Habermasian Communicative Subject'],
  jean_luc_nancy_being_with: ["Jean Luc Nancy's Being-With", 'Jean-Luc Nancy'],
  fanonian_analysis: ['Franz Fanon Analysis', 'Frantz Fanon Analysis'],
  kristevan_abjection_semiotic: ["Julia Kristeva's Abjection and the Semiotic", 'Kristevan Analysis', 'Julia Kristeva'],
  gallagher_pattern_theory_self: ["Gallagher's Pattern Theory of Self", 'A Pattern Theory of Self', 'Pattern Theory of Self'],
  husserlian_phenomenology: ["Husserl's Phenomenology", 'Edmund Husserl', 'Husserl'],
  whitehead_process_philosophy: ["Whitehead's Process Philosophy", 'Alfred North Whitehead', 'Whitehead'],
  aesthetics_untranslatables: ['Aesthetics', 'Aesthetics and the Untranslatable', 'Dictionary of Untranslatables Aesthetics'],
  ancient_egyptian_interpretation: ['Ancient Egyptian Interpretation', 'Ancient Egyptian', 'Ancient Egyption', 'Ancient Egyptian Religion'],
  crip_studies: ['Crip', 'Crip Studies', 'Crip Theory'],
  steiner_education: ['Steiner Education', 'Waldorf Education', 'Rudolf Steiner Education'],
  vitalism_analysis: ['Vitalism'],
  organicism_analysis: ['Organicism'],
  spivak_subaltern_analysis: ['Gayatry Chacravorty Spivak', 'Gayatri Chakravorty Spivak', "Spivak's Subaltern Analysis"],
  jasper_hoffmeyer_biosemiotics: ['Jasper Hoffmeyer', 'Jesper Hoffmeyer', "Hoffmeyer's Biosemiotics"],
  andre_baier_tins_d_analysis: ["André Baier's TINS_D Analysis", "Andre Baier's TINS_D Analysis", 'TINS_D Analysis'],
  donna_haraway_situated_knowledges: ["Donna Haraway's Situated Knowledges", 'Donna Haraway', 'Situated Knowledges'],
  socio_technical_transitions_mlp: ['Multi-Level Perspective', 'Socio-Technical Transitions', 'Socio-technical Transitions and the Multi-Level Perspective'],
  poetics_analysis: ['Poetry', 'Poetics'],
  isabelle_stengers_cosmopolitics: ['Isobella Stengers', 'Isabelle Stengers', "Stengers' Cosmopolitics"],
  metascience_analysis: ['MetaScience', 'Metascience']
};

const PERSPECTIVE_CHRONOLOGY: string[] = [
  'indigenous_australian_philosophy_accumulated',
  'ancient_religious_interpretation',
  'ancient_egyptian_interpretation',
  'first_testament_hebrew_interpretation',
  'greek_gods_interpretation',
  'roman_gods_interpretation',
  'druidic_interpretation',
  'buddhist_psychology_perspective',
  'second_testament_christian_interpretation',
  'muslim_interpretation',
  'pagan_interpretation',
  'bible_teachings_perspective',
  'cartographic_analysis',
  'geography_analysis',
  'platonic_perspective',
  'aristotle_argonic_teachings',
  'cynics_perspective',
  'stoicism_perspective',
  'metaphysical_analysis',
  'ontological_analysis',
  'ethical_analysis',
  'philosophy_of_mind_perspective',
  'descartes_cogito_subject',
  'spinoza_theologic_ethico_perspective',
  'leibniz_monadology_perspective',
  'lockean_personal_identity',
  'humean_bundle_self',
  'rousseau_political_thought',
  'aesthetics_untranslatables',
  'kantian_transcendental_subject',
  'hegelian_recognition_subject',
  'kierkegaard_existential_faith',
  'schopenhauer_will_representation',
  'marxian_analysis',
  'political_thought',
  'theories_of_world_politics',
  'democracy_analysis',
  'critique_of_human_rights',
  'healthy_in_all_policies',
  'social_policy_analysis',
  'nietzschean_perspective',
  'collingwood_historical_imagination',
  'freudian_psychoanalysis',
  'jungian_perspective',
  'logics_analysis',
  'epistemology_analysis',
  'linguistic_analysis',
  'semiotic_analysis',
  'argumentation_construction_analysis',
  'husserlian_phenomenology',
  'phenomenology_perspective',
  'heideggerian_dasein_analysis',
  'whitehead_process_philosophy',
  'process_philosophical_analysis',
  'vitalism_analysis',
  'organicism_analysis',
  'bataillean_analysis',
  'levinasian_ethics',
  'hermeneutics_perspective',
  'existential_perspective',
  'sartrean_subjectivity',
  'de_beauvoir_situated_subject',
  'merleau_ponty_embodied_subject',
  'feminist_philosophy',
  'feminist_perspective',
  'standpoint_theory',
  'radical_feminism',
  'ecofeminism',
  'lacanian_perspective',
  'kristevan_abjection_semiotic',
  'critical_theory_perspective',
  'horkheimer_critical_theory',
  'wittgenstein_language_games',
  'philosophy_of_language_analysis',
  'pf_strawson_personhood',
  'social_theories_of_deviance',
  'discourse_analysis',
  'sociology_analysis',
  'social_research_methods',
  'montessori_method',
  'steiner_education',
  'piaget_developmental_theory',
  'vygotsky_sociocultural_theory',
  'primary_pedagogy',
  'secondary_pedagogy',
  'tertiary_pedagogy',
  'trades_pedagogy',
  'critical_theory_perspective',
  'harry_frankfurt_volitional_self',
  'sydney_shoemaker_self_knowledge',
  'bernard_williams_personal_identity',
  'paul_ricoeur_narrative_identity',
  'derek_parfit_reductionist_identity',
  'habermasian_communicative_subject',
  'charles_taylor_sources_self',
  'macintyre_narrative_self',
  'jean_luc_nancy_being_with',
  'irigarayian_perspective',
  'bell_hooks_love_pedagogy',
  'elizabeth_grosz_corporeal_feminism',
  'judith_butler_performativity',
  'catriona_mackenzie_relational_autonomy',
  'christine_korsgaard_self_constitution',
  'marya_schechtman_narrative_self',
  'linda_alcoff_visible_identities',
  'anthony_appiah_identity_ethics',
  'adriana_cavarero_relational_uniqueness',
  'dan_zahavi_minimal_self',
  'shaun_gallagher_embodied_self',
  'gallagher_pattern_theory_self',
  'donna_haraway_situated_knowledges',
  'rosi_braidotti_nomadic_subjectivity',
  'simondonian_analysis',
  'foucaultian_analysis',
  'derridian_analysis',
  'post_structuralism_analysis',
  'schizoanalytic_insights',
  'jacques_ranciere_politics_aesthetics',
  'zizekian_analysis',
  'spivak_subaltern_analysis',
  'posthumanism_perspective',
  'topological_analysis',
  'narrative_psychology_perspective',
  'creative_nonfiction_perspective',
  'music_songwriting_analysis',
  'idiotextual_analysis',
  'frame_analysis',
  'goffman_frame_analysis',
  'media_studies',
  'poetics_analysis',
  'art_theory_analysis',
  'susan_sontag_interpretation',
  'tessa_laird_cinemal',
  'psychiatry_perspective',
  'attachment_theory_perspective',
  'gestalt_perspective',
  'transpersonal_perspective',
  'maslow_hierarchy_needs',
  MYERS_BRIGGS_PERSPECTIVE_KEY,
  'cbt_perspective',
  'positive_psychology_perspective',
  'asian_japanese_parental_guidance',
  'african_zimbabwean_parental_guidance',
  'western_parental_guidance',
  'advice_from_grandma',
  'lgbtq_studies_perspective',
  'sexualities_studies',
  'gender_studies',
  'queer_theory_perspective',
  'trans_studies',
  'identity_politics_analysis',
  'fanonian_analysis',
  'critical_race_studies',
  'decolonial_studies',
  'crip_studies',
  'fat_studies',
  'mad_studies',
  'ecology_perspective',
  'traditional_ecological_knowledges',
  'quantum_theory_analysis',
  'chaos_theory_analysis',
  'gregory_bateson_ecology_mind',
  'science_technology_studies',
  'latourian_analysis',
  'karen_barad_agential_realism',
  'isabelle_stengers_cosmopolitics',
  'new_materialisms',
  'moral_naturalism_perspective',
  'naturalism_analysis',
  'philosophy_of_science_analysis',
  'philosophy_of_physics_analysis',
  'feyerabend_epistemological_anarchism',
  'michel_serres_relations',
  'resilience_analysis',
  'social_ecological_systems_theory',
  'critical_food_systems_analysis',
  'feminist_food_studies',
  'biomimicry_perspective',
  'environmental_humanities',
  'ecopoiesis_perspective',
  'rewilding_analysis',
  'regenerative_design',
  'permaculture',
  'landscape_design_theory',
  'reciprocity_mutual_aid',
  'jasper_hoffmeyer_biosemiotics',
  'mechanical_engineering_analysis',
  'computer_science_analysis',
  'data_science_analysis',
  'metascience_analysis',
  'australian_legal_discourse',
  'swot_analysis',
  'grounded_theory',
  'autoethnography',
  'feasibility_analysis',
  'risk_analysis',
  'transitional_theory',
  'socio_technical_transitions_mlp',
  'organisational_theories',
  'organisational_transformation',
  'social_movement_theories',
  'andre_baier_tins_d_analysis',
  'tacktical_methodological_analysis',
  'transformative_futures'
];

function getChronologicalPerspectiveKeys(): string[] {
  const knownPerspectiveKeys = Object.keys(PERSPECTIVES);
  const seen = new Set<string>();
  const orderedKeys = PERSPECTIVE_CHRONOLOGY.filter((key) => {
    if (!PERSPECTIVES[key] || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  for (const key of knownPerspectiveKeys) {
    if (!seen.has(key)) {
      orderedKeys.push(key);
      seen.add(key);
    }
  }

  return orderedKeys;
}

function getChronologicalGroupKeys(): string[] {
  const seen = new Set<string>();
  const orderedGroups: string[] = [];

  for (const key of getChronologicalPerspectiveKeys()) {
    const groupKey = PERSPECTIVES[key]?.group;
    if (!groupKey || seen.has(groupKey) || !PERSPECTIVE_GROUPS[groupKey]) continue;
    seen.add(groupKey);
    orderedGroups.push(groupKey);
  }

  for (const groupKey of Object.keys(PERSPECTIVE_GROUPS)) {
    if (!seen.has(groupKey)) {
      seen.add(groupKey);
      orderedGroups.push(groupKey);
    }
  }

  return orderedGroups;
}

const SEMIOTIC_LINGUISTIC_PERSPECTIVE_KEYS = ['linguistic_analysis', 'semiotic_analysis'];
const PHILOSOPHY_LINEAGE_PERSPECTIVE_KEYS = ['husserlian_phenomenology', 'whitehead_process_philosophy'];
const ACCUMULATED_CHRONOLOGY_PERSPECTIVE_KEYS = [
  'indigenous_australian_philosophy_accumulated',
  'tessa_laird_cinemal',
  'asian_japanese_parental_guidance',
  'african_zimbabwean_parental_guidance',
  'western_parental_guidance',
  'ecology_perspective',
  'social_ecological_systems_theory',
  'mechanical_engineering_analysis',
  'australian_legal_discourse',
  'grounded_theory',
  'autoethnography'
];
const SELF_SUBJECTIVITY_PERSPECTIVE_KEYS = [
  'descartes_cogito_subject',
  'lockean_personal_identity',
  'humean_bundle_self',
  'kantian_transcendental_subject',
  'hegelian_recognition_subject',
  'heideggerian_dasein_analysis',
  'sartrean_subjectivity',
  'de_beauvoir_situated_subject',
  'merleau_ponty_embodied_subject',
  'pf_strawson_personhood',
  'harry_frankfurt_volitional_self',
  'sydney_shoemaker_self_knowledge',
  'bernard_williams_personal_identity',
  'paul_ricoeur_narrative_identity',
  'derek_parfit_reductionist_identity',
  'charles_taylor_sources_self',
  'macintyre_narrative_self',
  'judith_butler_performativity',
  'catriona_mackenzie_relational_autonomy',
  'christine_korsgaard_self_constitution',
  'marya_schechtman_narrative_self',
  'linda_alcoff_visible_identities',
  'anthony_appiah_identity_ethics',
  'adriana_cavarero_relational_uniqueness',
  'dan_zahavi_minimal_self',
  'shaun_gallagher_embodied_self',
  'gallagher_pattern_theory_self',
  'rosi_braidotti_nomadic_subjectivity'
];
const MATERIAL_DISCURSIVE_PERSPECTIVE_KEYS = [
  'leibniz_monadology_perspective',
  'moral_naturalism_perspective',
  'levinasian_ethics',
  'habermasian_communicative_subject',
  'jean_luc_nancy_being_with',
  'kristevan_abjection_semiotic',
  'music_songwriting_analysis',
  'marxian_analysis',
  'bataillean_analysis',
  'fanonian_analysis',
  'gregory_bateson_ecology_mind',
  'quantum_theory_analysis',
  'karen_barad_agential_realism'
];
const DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS = [
  'maslow_hierarchy_needs',
  'montessori_method',
  'steiner_education',
  'piaget_developmental_theory',
  'vygotsky_sociocultural_theory'
];
const ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS = ['organisational_transformation'];

const GROUP_DEFAULT_METADATA: Record<string, PerspectiveMetadata> = {
  [PHILOSOPHY_GROUP_KEY]: {
    tradition: 'Philosophy and first-principles inquiry',
    orientation: 'Mixed across pre-divide, continental, analytic, and bridge traditions',
    lineage: 'Cross-historical philosophical lineages'
  },
  religious_mythic_interpretation: {
    tradition: 'Religious, mythic, and sacred traditions',
    orientation: 'Outside the later analytic/continental divide',
    lineage: 'Ancient and living ritual, textual, and mythic inheritances'
  },
  social_spatial_research: {
    tradition: 'Social science, spatial inquiry, and research method',
    orientation: 'Methodological rather than analytic/continental',
    lineage: 'Geographical, sociological, and empirical inquiry traditions'
  },
  narrative_media_frame: {
    tradition: 'Language, narrative, media, and interaction studies',
    orientation: 'Mixed humanities and social theory',
    lineage: 'Semiotic, linguistic, media, and interpretive traditions'
  },
  psychoanalytic_clinical: {
    tradition: 'Psychoanalytic, developmental, and clinical traditions',
    orientation: 'Mixed clinical and theoretical lineages',
    lineage: 'Freudian, post-Freudian, developmental, and therapeutic traditions'
  },
  family_care_guidance: {
    tradition: 'Education, development, and family guidance',
    orientation: 'Applied developmental and sociocultural traditions',
    lineage: 'Pedagogical, developmental, and kinship guidance traditions'
  },
  archeo_genealogical_deconstruction: {
    tradition: 'Historical materialist, genealogical, and deconstructive theory',
    orientation: 'Mostly continental critical theory',
    lineage: 'Marx -> Nietzsche -> psychoanalytic and post-structural critique'
  },
  gender_sexuality_queer: {
    tradition: 'Feminist, queer, gender, and sexuality studies',
    orientation: 'Mostly continental and interdisciplinary critical theory',
    lineage: 'Feminist, queer, trans, and sexuality studies lineages'
  },
  race_coloniality_embodiment: {
    tradition: 'Critical race, decolonial, and embodiment studies',
    orientation: 'Interdisciplinary critical traditions',
    lineage: 'Anticolonial, decolonial, abolitionist, and embodiment critique'
  },
  systems_ecology_food: {
    tradition: 'Ecology, systems, science studies, and food futures',
    orientation: 'Interdisciplinary systems and ecological traditions',
    lineage: 'Ecology, cybernetics, STS, resilience, and environmental humanities'
  },
  strategy_method_organisation: {
    tradition: 'Organisation, planning, method, and implementation',
    orientation: 'Applied strategy and research traditions',
    lineage: 'Management, design, law, engineering, and movement strategy'
  }
};

const PERSPECTIVE_METADATA: Record<string, PerspectiveMetadata> = {
  indigenous_australian_philosophy_accumulated: {
    tradition: 'Australian Indigenous philosophies and sovereign knowledge traditions',
    orientation: 'Outside the later analytic/continental divide',
    chronology: 'Ancient and ongoing',
    lineage: 'Country, kinship, law, story, and custodial continuities'
  },
  buddhist_psychology_perspective: {
    tradition: 'Buddhist philosophy and psychology',
    orientation: 'Outside the later analytic/continental divide',
    chronology: 'Ancient and ongoing',
    lineage: 'Buddhist philosophical and contemplative traditions'
  },
  platonic_perspective: {
    tradition: 'Classical Greek philosophy',
    orientation: 'Pre-divide',
    chronology: 'Classical antiquity',
    lineage: 'Socratic -> Platonic'
  },
  aristotle_argonic_teachings: {
    tradition: 'Classical Greek philosophy',
    orientation: 'Pre-divide',
    chronology: 'Classical antiquity',
    lineage: 'Platonic Academy -> Aristotle -> rhetoric, ethics, logic'
  },
  cynics_perspective: {
    tradition: 'Hellenistic philosophy',
    orientation: 'Pre-divide',
    chronology: 'Classical and Hellenistic antiquity',
    lineage: 'Socratic and Cynic lineages'
  },
  stoicism_perspective: {
    tradition: 'Hellenistic philosophy',
    orientation: 'Pre-divide',
    chronology: 'Hellenistic and Roman antiquity',
    lineage: 'Cynic and Stoic ethical lineages'
  },
  descartes_cogito_subject: {
    tradition: 'Early modern rationalism',
    orientation: 'Pre-divide',
    chronology: '17th century',
    lineage: 'Rationalist philosophy -> modern subjectivity debates'
  },
  spinoza_theologic_ethico_perspective: {
    tradition: 'Early modern rationalism and immanence',
    orientation: 'Pre-divide',
    chronology: '17th century',
    lineage: 'Rationalism -> immanence -> later materialist and affect theory'
  },
  leibniz_monadology_perspective: {
    tradition: 'Early modern rationalism and metaphysics',
    orientation: 'Pre-divide',
    chronology: '17th to early 18th century',
    lineage: 'Rationalist metaphysics -> idealist and systems lineages'
  },
  lockean_personal_identity: {
    tradition: 'Early modern empiricism and political philosophy',
    orientation: 'Pre-divide',
    chronology: '17th century',
    lineage: 'Empiricism -> personal identity debates'
  },
  humean_bundle_self: {
    tradition: 'Empiricism and skepticism',
    orientation: 'Pre-divide',
    chronology: '18th century',
    lineage: 'British empiricism -> skepticism -> later analytic debates'
  },
  moral_naturalism_perspective: {
    tradition: 'Ethics and metaethics',
    orientation: 'Mostly analytic',
    chronology: 'Modern and contemporary',
    lineage: 'Aristotle and naturalist ethics -> contemporary metaethics'
  },
  kantian_transcendental_subject: {
    tradition: 'German idealism and transcendental philosophy',
    orientation: 'Pre-divide',
    chronology: '18th century',
    lineage: 'Kant -> idealism, phenomenology, and analytic moral philosophy'
  },
  hegelian_recognition_subject: {
    tradition: 'German idealism',
    orientation: 'Pre-divide to continental lineage',
    chronology: '19th century',
    lineage: 'Kant -> Hegel -> Marx, existentialism, recognition theory'
  },
  marxian_analysis: {
    tradition: 'Marxism and historical materialism',
    orientation: 'Pre-divide to continental critical lineage',
    chronology: '19th century',
    lineage: 'Hegel -> Marx and Engels -> critical theory, cultural materialism, ideology critique'
  },
  nietzschean_perspective: {
    tradition: 'Genealogical philosophy and critique of values',
    orientation: 'Pre-divide to continental lineage',
    chronology: '19th century',
    lineage: 'Nietzsche -> Freud, Foucault, Deleuze, genealogy'
  },
  husserlian_phenomenology: {
    tradition: 'Phenomenology',
    orientation: 'Pre-divide to continental lineage',
    chronology: 'Late 19th to early 20th century',
    lineage: 'Brentano -> Husserl -> Heidegger, Sartre, de Beauvoir, Merleau-Ponty, Zahavi, Gallagher'
  },
  phenomenology_perspective: {
    tradition: 'Phenomenology',
    orientation: 'Mostly continental',
    chronology: '20th century onward',
    lineage: 'Husserl -> existential, hermeneutic, embodied, and postphenomenological currents'
  },
  heideggerian_dasein_analysis: {
    tradition: 'Phenomenology and existential ontology',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Husserl -> Heidegger -> existentialism, hermeneutics, deconstruction'
  },
  hermeneutics_perspective: {
    tradition: 'Hermeneutics',
    orientation: 'Mostly continental',
    chronology: '19th and 20th century onward',
    lineage: 'Schleiermacher and Dilthey -> Heidegger -> Gadamer and Ricoeur'
  },
  existential_perspective: {
    tradition: 'Existentialism and existential phenomenology',
    orientation: 'Continental',
    chronology: '19th and 20th century',
    lineage: 'Kierkegaard and Nietzsche -> Heidegger -> Sartre, de Beauvoir, Merleau-Ponty'
  },
  sartrean_subjectivity: {
    tradition: 'Existentialism and existential phenomenology',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Husserl and Heidegger -> Sartre -> postwar existentialism'
  },
  de_beauvoir_situated_subject: {
    tradition: 'Existentialism, feminist philosophy, and situated freedom',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Hegel and existential phenomenology -> de Beauvoir -> feminist existential lineages'
  },
  merleau_ponty_embodied_subject: {
    tradition: 'Phenomenology and existential phenomenology',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Husserl -> Merleau-Ponty -> embodiment, perception, postphenomenology'
  },
  levinasian_ethics: {
    tradition: 'Phenomenology and ethics',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Husserl and Heidegger -> Levinas -> ethics of alterity'
  },
  whitehead_process_philosophy: {
    tradition: 'Process philosophy',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '20th century',
    lineage: 'Mathematics and metaphysics -> Whitehead -> process thought, theology, ecology'
  },
  process_philosophical_analysis: {
    tradition: 'Process philosophy',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '20th century onward',
    lineage: 'Whitehead -> process philosophy, process theology, ecological and relational thought'
  },
  vitalism_analysis: {
    tradition: 'Vitalism and philosophy of life',
    orientation: 'Pre-divide to mixed modern reception',
    chronology: '18th to 20th century',
    lineage: 'Life-force debates -> vitalism -> Bergson, philosophy of biology, and organismic thought'
  },
  organicism_analysis: {
    tradition: 'Organicism and philosophy of biology',
    orientation: 'Bridge across philosophy and life sciences',
    chronology: '19th and 20th century',
    lineage: 'Aristotelian organism, romantic science, biology, systems thought -> organicism'
  },
  pf_strawson_personhood: {
    tradition: 'Ordinary language philosophy and analytic metaphysics',
    orientation: 'Analytic',
    chronology: '20th century',
    lineage: 'Analytic philosophy -> personhood and reactive attitudes debates'
  },
  harry_frankfurt_volitional_self: {
    tradition: 'Analytic action theory and moral psychology',
    orientation: 'Analytic',
    chronology: '20th century',
    lineage: 'Analytic philosophy of action -> autonomy and second-order desire debates'
  },
  sydney_shoemaker_self_knowledge: {
    tradition: 'Analytic philosophy of mind',
    orientation: 'Analytic',
    chronology: '20th century',
    lineage: 'Analytic philosophy of language and mind -> self-knowledge debates'
  },
  bernard_williams_personal_identity: {
    tradition: 'Analytic ethics and philosophy of mind',
    orientation: 'Analytic',
    chronology: '20th century',
    lineage: 'Analytic personal identity debates with historical depth'
  },
  paul_ricoeur_narrative_identity: {
    tradition: 'Hermeneutics and phenomenology',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Hermeneutics and phenomenology -> Ricoeur -> narrative identity'
  },
  derek_parfit_reductionist_identity: {
    tradition: 'Analytic ethics and personal identity',
    orientation: 'Analytic',
    chronology: '20th century',
    lineage: 'Analytic reductionist identity debates'
  },
  habermasian_communicative_subject: {
    tradition: 'Critical theory and communicative action',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Frankfurt School -> Habermas -> discourse ethics and deliberation'
  },
  charles_taylor_sources_self: {
    tradition: 'Political philosophy and hermeneutic moral philosophy',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '20th and 21st century',
    lineage: 'Hegelian and hermeneutic currents -> Taylor'
  },
  macintyre_narrative_self: {
    tradition: 'Virtue ethics and tradition-constituted reasoning',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '20th and 21st century',
    lineage: 'Aristotle and Marx -> MacIntyre -> practices and narrative unity'
  },
  jean_luc_nancy_being_with: {
    tradition: 'Post-Heideggerian continental philosophy',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Heidegger and deconstruction -> Nancy'
  },
  judith_butler_performativity: {
    tradition: 'Gender theory, post-structuralism, and feminist philosophy',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'Hegel, Foucault, psychoanalysis -> Butler'
  },
  catriona_mackenzie_relational_autonomy: {
    tradition: 'Feminist ethics and relational autonomy',
    orientation: 'Mostly analytic with interdisciplinary feminist lineages',
    chronology: '21st century',
    lineage: 'Feminist ethics and autonomy debates -> relational autonomy'
  },
  christine_korsgaard_self_constitution: {
    tradition: 'Kantian ethics and analytic moral philosophy',
    orientation: 'Analytic',
    chronology: '20th and 21st century',
    lineage: 'Kant -> analytic moral philosophy -> constitutive agency'
  },
  marya_schechtman_narrative_self: {
    tradition: 'Analytic personal identity and narrative theory',
    orientation: 'Analytic',
    chronology: '20th and 21st century',
    lineage: 'Analytic identity debates -> narrative self'
  },
  linda_alcoff_visible_identities: {
    tradition: 'Feminist philosophy, race theory, and phenomenology',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'Phenomenology, feminism, and race theory -> Alcoff'
  },
  anthony_appiah_identity_ethics: {
    tradition: 'Ethics, social philosophy, and cosmopolitanism',
    orientation: 'Analytic and bridge traditions',
    chronology: 'Late 20th and 21st century',
    lineage: 'Analytic ethics and social identity debates -> Appiah'
  },
  adriana_cavarero_relational_uniqueness: {
    tradition: 'Continental feminist philosophy',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Arendtian and feminist lineages -> Cavarero'
  },
  dan_zahavi_minimal_self: {
    tradition: 'Phenomenology and philosophy of mind',
    orientation: 'Continental with analytic dialogue',
    chronology: '21st century',
    lineage: 'Husserl -> Zahavi -> self-awareness debates'
  },
  shaun_gallagher_embodied_self: {
    tradition: 'Phenomenology, cognitive science, and philosophy of mind',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '21st century',
    lineage: 'Husserl and Merleau-Ponty -> enactivism and embodied cognition'
  },
  gallagher_pattern_theory_self: {
    tradition: 'Phenomenology, enactivism, and interdisciplinary self theory',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '21st century',
    lineage: 'Phenomenology, cognitive science, narrative theory -> Gallagher'
  },
  rosi_braidotti_nomadic_subjectivity: {
    tradition: 'Continental feminist and posthuman philosophy',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Deleuze, feminism, and posthuman thought -> Braidotti'
  },
  topological_analysis: {
    tradition: 'Topology-inflected continental and spatial theory',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Contemporary',
    lineage: 'Phenomenology, Deleuze, spatial and relational theory'
  },
  kristevan_abjection_semiotic: {
    tradition: 'Psychoanalysis, semiotics, and post-structuralism',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Freud, Lacan, semiotics, and feminism -> Kristeva'
  },
  freudian_psychoanalysis: {
    tradition: 'Psychoanalysis',
    orientation: 'Pre-divide to mixed modern reception',
    chronology: 'Late 19th and early 20th century',
    lineage: 'Freud -> psychoanalytic traditions'
  },
  jungian_perspective: {
    tradition: 'Analytical psychology',
    orientation: 'Outside the analytic/continental divide in a strict sense',
    chronology: '20th century',
    lineage: 'Freud -> Jungian depth psychology'
  },
  lacanian_perspective: {
    tradition: 'Psychoanalysis and structuralism',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Freud -> Lacan -> post-structural and Žižekian lineages'
  },
  critical_theory_perspective: {
    tradition: 'Critical theory',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Marx -> Frankfurt School -> critique of modernity'
  },
  simondonian_analysis: {
    tradition: 'Continental philosophy of technics and individuation',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Postwar French philosophy -> Simondon -> Deleuze and technics studies'
  },
  foucaultian_analysis: {
    tradition: 'Genealogy and post-structuralism',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Nietzsche -> Foucault -> genealogy, discourse, governmentality'
  },
  derridian_analysis: {
    tradition: 'Deconstruction',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Phenomenology and structuralism -> Derrida -> deconstruction'
  },
  schizoanalytic_insights: {
    tradition: 'Deleuzian and Guattarian schizoanalysis',
    orientation: 'Continental',
    chronology: 'Late 20th century',
    lineage: 'Nietzsche, Marx, Freud -> Deleuze and Guattari'
  },
  zizekian_analysis: {
    tradition: 'Lacanian Hegelian ideology critique',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Hegel, Marx, Lacan -> Žižek'
  },
  posthumanism_perspective: {
    tradition: 'Posthumanism',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'Nietzsche, feminism, STS, and ecological thought'
  },
  quantum_theory_analysis: {
    tradition: 'Physics and philosophy of science',
    orientation: 'Outside the analytic/continental divide in a strict sense',
    chronology: '20th century onward',
    lineage: 'Modern physics -> philosophy of science and material-discursive interpretation'
  },
  gregory_bateson_ecology_mind: {
    tradition: 'Cybernetics, systems theory, and ecology of mind',
    orientation: 'Bridge across philosophy, anthropology, and systems thought',
    chronology: '20th century',
    lineage: 'Cybernetics and anthropology -> Bateson -> systems ecology'
  },
  latourian_analysis: {
    tradition: 'Science and technology studies',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'STS -> actor-network theory -> Latour'
  },
  karen_barad_agential_realism: {
    tradition: 'Feminist science studies and new materialism',
    orientation: 'Continental and interdisciplinary',
    chronology: '21st century',
    lineage: 'Bohr, feminist theory, STS -> Barad'
  },
  rousseau_political_thought: {
    tradition: 'Modern political philosophy and education',
    orientation: 'Pre-divide',
    chronology: '18th century',
    lineage: 'Republican and social contract traditions -> Rousseau -> democracy and education'
  },
  aesthetics_untranslatables: {
    tradition: 'Aesthetics and philosophical lexicon',
    orientation: 'Pre-divide to contemporary contested field',
    chronology: 'Ancient Greek roots, 18th century disciplinary crystallization, and contemporary translation debates',
    lineage: 'Aisthesis -> Baumgarten and Kant -> aesthetics, art theory, Ranciere, Sontag, and debates on the sensible and the untranslatable'
  },
  kierkegaard_existential_faith: {
    tradition: 'Existential Christianity and philosophy',
    orientation: 'Pre-divide to continental lineage',
    chronology: '19th century',
    lineage: 'Christian existential thought -> Kierkegaard -> existentialism'
  },
  schopenhauer_will_representation: {
    tradition: 'Post-Kantian philosophy',
    orientation: 'Pre-divide',
    chronology: '19th century',
    lineage: 'Kant -> Schopenhauer -> Nietzsche and pessimism debates'
  },
  collingwood_historical_imagination: {
    tradition: 'Philosophy of history and idealism',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '20th century',
    lineage: 'British idealism and historical method -> Collingwood'
  },
  logics_analysis: {
    tradition: 'Logic',
    orientation: 'Pre-divide to analytic reception',
    chronology: 'Ancient to contemporary',
    lineage: 'Aristotle -> symbolic logic -> analytic method'
  },
  epistemology_analysis: {
    tradition: 'Epistemology',
    orientation: 'Mixed across pre-divide, analytic, and continental traditions',
    chronology: 'Ancient to contemporary',
    lineage: 'Plato and Aristotle -> empiricism and rationalism -> contemporary epistemology'
  },
  feminist_philosophy: {
    tradition: 'Feminist philosophy',
    orientation: 'Mixed across analytic and continental feminist traditions',
    chronology: '20th and 21st century',
    lineage: 'de Beauvoir, Irigaray, hooks, Butler, Mackenzie, Grosz, Haraway, and feminist epistemology'
  },
  philosophy_of_language_analysis: {
    tradition: 'Philosophy of language',
    orientation: 'Mostly analytic with broader linguistic and hermeneutic dialogue',
    chronology: '20th century onward',
    lineage: 'Frege, Wittgenstein, ordinary language philosophy, speech-act theory'
  },
  wittgenstein_language_games: {
    tradition: 'Ordinary language philosophy and analytic philosophy',
    orientation: 'Analytic',
    chronology: '20th century',
    lineage: 'Analytic philosophy -> Wittgenstein -> ordinary language and rule-following debates'
  },
  naturalism_analysis: {
    tradition: 'Naturalism',
    orientation: 'Mostly analytic with broader philosophical uptake',
    chronology: '19th century onward',
    lineage: 'Scientific naturalism and immanent explanation traditions'
  },
  philosophy_of_science_analysis: {
    tradition: 'Philosophy of science',
    orientation: 'Mostly analytic with interdisciplinary dialogue',
    chronology: '20th century onward',
    lineage: 'Philosophy of science, scientific realism debates, and methodology'
  },
  philosophy_of_physics_analysis: {
    tradition: 'Philosophy of physics',
    orientation: 'Mostly analytic with scientific dialogue',
    chronology: '20th century onward',
    lineage: 'Modern physics -> philosophy of time, causation, and laws'
  },
  feyerabend_epistemological_anarchism: {
    tradition: 'Philosophy of science',
    orientation: 'Bridge across analytic and continental reception',
    chronology: '20th century',
    lineage: 'Philosophy of science -> Feyerabend -> methodological pluralism'
  },
  michel_serres_relations: {
    tradition: 'Continental philosophy of relation and science',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'French philosophy of science and relation -> Serres'
  },
  jacques_ranciere_politics_aesthetics: {
    tradition: 'Continental political aesthetics',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Post-Althusserian thought -> Rancière -> dissensus and aesthetics'
  },
  horkheimer_critical_theory: {
    tradition: 'Frankfurt School critical theory',
    orientation: 'Continental',
    chronology: '20th century',
    lineage: 'Marx -> Horkheimer -> critical theory and critique of instrumental reason'
  },
  post_structuralism_analysis: {
    tradition: 'Post-structuralism',
    orientation: 'Continental',
    chronology: 'Late 20th century',
    lineage: 'Structuralism and phenomenology -> Foucault, Derrida, Deleuze, Kristeva, Butler, Spivak'
  },
  spivak_subaltern_analysis: {
    tradition: 'Postcolonial theory and deconstruction',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'Marxism, deconstruction, feminism -> Spivak'
  },
  standpoint_theory: {
    tradition: 'Feminist epistemology',
    orientation: 'Mixed analytic, continental, and interdisciplinary feminist traditions',
    chronology: 'Late 20th and 21st century',
    lineage: 'Feminist epistemology -> standpoint theory -> situated knowledge debates'
  },
  bell_hooks_love_pedagogy: {
    tradition: 'Black feminist thought and critical pedagogy',
    orientation: 'Interdisciplinary critical tradition',
    chronology: 'Late 20th and 21st century',
    lineage: 'Black feminism and Freirean pedagogy -> bell hooks'
  },
  elizabeth_grosz_corporeal_feminism: {
    tradition: 'Continental feminist philosophy',
    orientation: 'Continental',
    chronology: 'Late 20th and 21st century',
    lineage: 'Deleuze, Bergson, feminism -> Grosz'
  },
  donna_haraway_situated_knowledges: {
    tradition: 'Feminist science studies and technoscience',
    orientation: 'Interdisciplinary critical tradition',
    chronology: 'Late 20th and 21st century',
    lineage: 'Feminist epistemology, STS, posthuman thought -> Haraway'
  },
  science_technology_studies: {
    tradition: 'Science and Technology Studies',
    orientation: 'Interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'History and sociology of science and technology -> STS -> Latour, Haraway, Barad'
  },
  isabelle_stengers_cosmopolitics: {
    tradition: 'Continental philosophy of science and cosmopolitics',
    orientation: 'Continental and interdisciplinary',
    chronology: 'Late 20th and 21st century',
    lineage: 'Philosophy of science, Whitehead, STS -> Stengers'
  },
  socio_technical_transitions_mlp: {
    tradition: 'Socio-technical transitions research',
    orientation: 'Interdisciplinary systems and innovation studies',
    chronology: 'Late 20th and 21st century',
    lineage: 'Innovation studies, sociology of technology, sustainability transitions -> Multi-Level Perspective'
  },
  metascience_analysis: {
    tradition: 'Metascience and research evaluation',
    orientation: 'Interdisciplinary methodological tradition',
    chronology: '21st century',
    lineage: 'Philosophy of science, statistics, research methodology -> metascience'
  },
  andre_baier_tins_d_analysis: {
    tradition: 'Critical sustainability education and democracy education',
    orientation: 'Applied interdisciplinary pedagogy',
    chronology: '21st century',
    lineage: 'Engineering responsibility, sustainability education, democratic pedagogy -> André Baier and TINS_D'
  }
};

function getPerspectiveMetadata(key: string, perspective: PerspectiveDefinition): PerspectiveMetadata {
  return {
    ...(GROUP_DEFAULT_METADATA[perspective.group] || {}),
    ...(PERSPECTIVE_METADATA[key] || {})
  };
}

function buildPerspectiveHistoryLabel(key: string, perspective: PerspectiveDefinition): string {
  const metadata = getPerspectiveMetadata(key, perspective);
  const parts = [
    metadata.tradition ? `Tradition: ${metadata.tradition}` : '',
    metadata.orientation ? `Placement: ${metadata.orientation}` : '',
    metadata.chronology ? `Chronology: ${metadata.chronology}` : '',
    metadata.lineage ? `Lineage: ${metadata.lineage}` : ''
  ].filter(Boolean);

  return parts.join(' | ');
}

function buildPerspectivePromptDescriptor(key: string, perspective: PerspectiveDefinition): string {
  const groupTitle = PERSPECTIVE_GROUPS[perspective.group]?.title || perspective.group;
  const historyLabel = buildPerspectiveHistoryLabel(key, perspective);
  return `${key}: ${perspective.title} [${groupTitle}] - ${perspective.description}${historyLabel ? ` | ${historyLabel}` : ''}`;
}

const PRE_HIERARCHY_PERSPECTIVE_KEYS = [
  'lacanian_perspective',
  'schizoanalytic_insights',
  'irigarayian_perspective',
  'jungian_perspective',
  'attachment_theory_perspective',
  'positive_psychology_perspective',
  'narrative_psychology_perspective',
  'phenomenology_perspective',
  'existential_perspective',
  'feminist_perspective',
  'queer_theory_perspective',
  'lgbtq_studies_perspective',
  'critical_theory_perspective',
  'posthumanism_perspective',
  'buddhist_psychology_perspective',
  'nietzschean_perspective',
  'gestalt_perspective',
  'transpersonal_perspective',
  'cbt_perspective',
  'hermeneutics_perspective',
  'stoicism_perspective',
  'psychiatry_perspective',
  MYERS_BRIGGS_PERSPECTIVE_KEY
];

const ASSESSMENT_QUESTIONS = [
  { trait: 'openness', question: 'I enjoy exploring new ideas and concepts, even if they seem unconventional.', reverse: false },
  { trait: 'openness', question: 'I prefer sticking to familiar routines rather than trying new approaches.', reverse: true },
  { trait: 'openness', question: 'I find abstract art and complex literature fascinating.', reverse: false },
  { trait: 'conscientiousness', question: 'I always complete tasks on time and rarely procrastinate.', reverse: false },
  { trait: 'conscientiousness', question: 'I tend to leave things until the last minute.', reverse: true },
  { trait: 'conscientiousness', question: 'I keep my living and working spaces well-organized.', reverse: false },
  { trait: 'extraversion', question: 'I feel energized after spending time with large groups of people.', reverse: false },
  { trait: 'extraversion', question: 'I prefer quiet evenings at home over social gatherings.', reverse: true },
  { trait: 'extraversion', question: 'I often take the lead in group situations.', reverse: false },
  { trait: 'agreeableness', question: 'I go out of my way to help others, even strangers.', reverse: false },
  { trait: 'agreeableness', question: "I tend to be skeptical of others' motives.", reverse: true },
  { trait: 'agreeableness', question: 'I avoid conflicts and try to maintain harmony.', reverse: false },
  { trait: 'neuroticism', question: 'I often worry about things that might go wrong.', reverse: false },
  { trait: 'neuroticism', question: 'I remain calm under pressure and in stressful situations.', reverse: true },
  { trait: 'neuroticism', question: 'My emotions tend to fluctuate significantly throughout the day.', reverse: false }
];

const SCALE_LABELS = ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree'];

const GOAL_CATEGORIES: Record<string, string> = {
  emotional_regulation: 'Emotional regulation', self_awareness: 'Self awareness',
  relationships: 'Relationships', personal_growth: 'Personal growth', behavioral_change: 'Behavioral change'
};

const ENTRY_TYPES: Record<string, string> = {
  morning_reflection: 'Morning reflection', evening_analysis: 'Evening analysis',
  breakthrough_moment: 'Breakthrough moment', free_form: 'Free form'
};

const SAFETY_DISCLAIMER = 'The Deleometer is a reflective conversation and journaling tool, not a medical device, diagnosis, treatment, or substitute for medication, therapy, crisis support, or professional care. AI can make mistakes and can sound more certain than it is. Treat responses as invitations to think with, question, revise, and discuss, not as truth to absorb undiluted.';
const PRIVACY_SECURITY_NOTICE = 'AI analysis sends journal, chat, goal, and context text to OpenAI when you use AI features. Saved analyses, chats, goals, author memory, and plugin settings are stored as local Obsidian data or Markdown, not encrypted by The Deleometer. Other installed Obsidian plugins, vault sync tools, backups, or anyone with device access may be able to read them.';

const ZPD_LEVELS: Record<string, { label: string; prompt: string }> = {
  primary_year_5: {
    label: 'Grade 5 primary student',
    prompt: 'Write for a curious Grade 5 primary student. Use plain everyday language, explain every key term, and gently stretch the reader one step beyond what a beginner would know.'
  },
  secondary_year_5: {
    label: 'Year 5 secondary student',
    prompt: 'Write for a Year 5 secondary student. Use clear school-level explanations, define specialist terms, and connect abstractions to concrete examples from the journal entry.'
  },
  tertiary_year_2: {
    label: 'Second-year tertiary student',
    prompt: 'Write for a second-year tertiary student. Teach the frame carefully, define key terms in context, and show how the interpretation was built from details in the journal entry.'
  },
  postgraduate: {
    label: 'Postgraduate',
    prompt: 'Write for a postgraduate reader. Use disciplinary vocabulary, but still gloss key terms and make the interpretive method explicit.'
  },
  postdoc: {
    label: 'Postdoc',
    prompt: 'Write for a postdoctoral reader. Permit technical nuance and methodological density while still explaining how each claim follows from the journal entry.'
  },
  professor: {
    label: 'Professor',
    prompt: 'Write for a professor. Use advanced theoretical language, but avoid name-dropping without interpretation and make the transdisciplinary stakes explicit.'
  }
};

const OUTPUT_LANGUAGES: Record<string, OutputLanguageOption> = {
  english: {
    label: 'English',
    prompt: 'Write all user-facing generated prose in English.'
  },
  french: {
    label: 'French',
    prompt: 'Write all user-facing generated prose in French. Keep proper names, exact perspective keys, required JSON keys, and original work titles when translating them would be misleading.'
  },
  german: {
    label: 'German',
    prompt: 'Write all user-facing generated prose in German. Keep proper names, exact perspective keys, required JSON keys, and original work titles when translating them would be misleading.'
  }
};

interface BigFiveScores { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number; }
interface PersonalityProfile { big_five_scores: BigFiveScores; assessment_date: string; dominant_traits: string[]; psychological_type: string; growth_areas: string[]; }
interface Milestone { title: string; completed: boolean; completion_date?: string; }
interface GoalSuggestion { title: string; description: string; category: string; targetDate?: string; milestones: string[]; sourcePerspectives: string[]; sourceAnalysisPath?: string; }
interface AnalysisPayload {
  perspectives: Record<string, string>;
  furtherReadings: Record<string, string[]>;
  groupSyntheses: Record<string, string>;
  philosophicalReaccumulation: string;
  authorMemorySummary: string;
  goalSuggestions: GoalSuggestion[];
  analysisWarnings: string[];
}
interface GoalFileData {
  file: TFile;
  title: string;
  description: string;
  category: string;
  targetDate?: string;
  milestones: string[];
  created: string;
  sourceAnalysisPath?: string;
  sourcePerspectives: string[];
  status: string;
}
interface GoalMergeDraft {
  sourceGoals: GoalFileData[];
  mergedTitle: string;
  mergedDescription: string;
  mergedCategory: string;
  mergedTargetDate?: string;
  mergedMilestones: string[];
  mergedSourceAnalysisPath?: string;
  mergedSourcePerspectives: string[];
}
interface MilestoneFileData {
  file: TFile;
  title: string;
  description: string;
  targetDate?: string;
  goalPath?: string;
  goalTitle?: string;
  milestoneIndex?: number;
  status: string;
  created: string;
  sourceAnalysisPath?: string;
  sourcePerspectives: string[];
}
interface MilestoneMergeDraft {
  sourceMilestones: MilestoneFileData[];
  mergedTitle: string;
  mergedDescription: string;
  mergedTargetDate?: string;
  mergedGoalPaths: string[];
  mergedGoalTitles: string[];
  mergedSourceAnalysisPath?: string;
  mergedSourcePerspectives: string[];
}

interface DeleometerSettings {
  openaiApiKey: string;
  journalFolder: string;
  goalsFolder: string;
  milestonesFolder: string;
  chatsFolder: string;
  fullCalendarFolder: string;
  autoSyncGoalsToFullCalendar: boolean;
  redactSensitiveDataBeforeAI: boolean;
  enableAuthorMemory: boolean;
  includeAuthorMemoryInAI: boolean;
  includePersonalityProfileInAI: boolean;
  sendFullJournalToChat: boolean;
  selectedPerspectives: string[];
  zpdLevel: string;
  outputLanguage: string;
  personalityProfile: PersonalityProfile | null;
  authorMemorySummary: string;
}

const DEFAULT_SETTINGS: DeleometerSettings = {
  openaiApiKey: '', journalFolder: 'Deleometer/Journal', goalsFolder: 'Deleometer/Goals',
  milestonesFolder: 'Deleometer/Milestones', chatsFolder: 'Deleometer/Chats', fullCalendarFolder: 'Deleometer', autoSyncGoalsToFullCalendar: true,
  redactSensitiveDataBeforeAI: true, enableAuthorMemory: true, includeAuthorMemoryInAI: true,
  includePersonalityProfileInAI: true, sendFullJournalToChat: false,
  selectedPerspectives: getChronologicalPerspectiveKeys(), zpdLevel: 'tertiary_year_2', outputLanguage: 'english',
  personalityProfile: null,
  authorMemorySummary: ''
};

interface ChatContext {
  chatKind?: 'perspective' | 'group_synthesis';
  perspective: string;
  journalContent: string;
  initialAnalysis: string;
  sourceFilePath?: string;
  sourceGroupKey?: string;
  sourceTitle?: string;
  sourceDescription?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

type AnalysisProgressCallback = (message: string) => void | Promise<void>;

export default class DeleometerPlugin extends Plugin {
  settings: DeleometerSettings;
  openai: OpenAI | null = null;
  pendingChatContext: ChatContext | null = null;

  async onload() {
    await this.loadSettings();
    if (this.settings.openaiApiKey) this.initializeOpenAI();

    this.registerView(VIEW_TYPE_DASHBOARD, (leaf) => new DashboardView(leaf, this));
    this.registerView(VIEW_TYPE_AI_CHAT, (leaf) => new AIChatView(leaf, this));

    this.addRibbonIcon('book-open', 'New journal entry', () => this.openJournalModal());
    this.addRibbonIcon('message-circle', 'AI emotional chat', () => this.activateAIChatView());
    this.addRibbonIcon('bar-chart-3', 'Emotional dashboard', () => this.activateDashboardView());
    this.addRibbonIcon('target', 'New goal', () => this.openGoalModal());
    this.addRibbonIcon('brain', 'Personality assessment', () => this.openPersonalityAssessment());

    this.addCommand({ id: 'create-journal-entry', name: 'Create new journal entry', callback: () => this.openJournalModal() });
    this.addCommand({ id: 'open-ai-chat', name: 'Open AI emotional chat', callback: () => this.activateAIChatView() });
    this.addCommand({ id: 'open-dashboard', name: 'Open emotional dashboard', callback: () => this.activateDashboardView() });
    this.addCommand({ id: 'analyze-current-note', name: 'Analyze current note emotions', editorCallback: (editor) => this.analyzeCurrentNote(editor) });
    this.addCommand({ id: 'create-goal', name: 'Create new goal', callback: () => this.openGoalModal() });
    this.addCommand({ id: 'personality-assessment', name: 'Take personality assessment', callback: () => this.openPersonalityAssessment() });
    this.addCommand({ id: 'backfill-analysis-chat-links', name: 'Backfill analysis chat links for current note', callback: async () => this.backfillAnalysisChatLinksForActiveFile() });
    this.addCommand({ id: 'sync-goals-to-full-calendar', name: 'Sync goals to calendar', callback: async () => this.syncAllGoalsToFullCalendar(true) });
    this.addCommand({ id: 'sync-milestones-to-folder', name: 'Sync milestones to folder', callback: async () => this.syncAllGoalMilestonesToFolder(true) });
    this.addCommand({ id: 'consolidate-similar-goals', name: 'Consolidate similar goals', callback: async () => this.openGoalConsolidationModal() });
    this.addCommand({ id: 'consolidate-similar-milestones', name: 'Consolidate similar milestones', callback: async () => this.openMilestoneConsolidationModal() });
    this.addCommand({ id: 'repair-goal-frontmatter', name: 'Repair goal note frontmatter', callback: async () => this.repairAllGoalFrontmatter(true) });

    this.addSettingTab(new DeleometerSettingTab(this.app, this));
    this.registerMarkdownPostProcessor((element) => {
      element.querySelectorAll('a[href^="deleometer://chat?"]').forEach((linkEl) => {
        const link = linkEl as HTMLAnchorElement;
        link.onclick = async (event) => {
          event.preventDefault();
          try {
            const url = new URL(link.href);
            const perspective = url.searchParams.get('perspective') || '';
            const group = url.searchParams.get('group') || '';
            const source = url.searchParams.get('source') || '';
            if (!this.getVaultMarkdownFile(source)) {
              new Notice('Invalid or unsafe chat link context');
              return;
            }
            if (perspective && PERSPECTIVES[perspective]) {
              await this.openChatFromSourceNote(source, perspective);
              return;
            }
            if (group && PERSPECTIVE_GROUPS[group]) {
              await this.openGroupChatFromSourceNote(source, group);
              return;
            }
            new Notice('Invalid or unsafe chat link context');
          } catch (error) {
            new Notice('Could not open chat from note link');
            console.error(error);
          }
        };
      });
      element.querySelectorAll('a[href^="deleometer://goals?"]').forEach((linkEl) => {
        const link = linkEl as HTMLAnchorElement;
        link.onclick = async (event) => {
          event.preventDefault();
          try {
            const url = new URL(link.href);
            const source = url.searchParams.get('source') || '';
            if (!this.getVaultMarkdownFile(source)) {
              new Notice('Invalid or unsafe goal draft context');
              return;
            }
            await this.openGoalDraftsFromSourceNote(source);
          } catch (error) {
            new Notice('Could not open goal drafts from note link');
            console.error(error);
          }
        };
      });
    });
  }

  initializeOpenAI() {
    this.openai = new OpenAI({
      apiKey: this.settings.openaiApiKey,
      dangerouslyAllowBrowser: true,
      maxRetries: 0
    });
  }

  async ensureFolder(path: string) {
    const parts = path.split('/');
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(currentPath)) await this.app.vault.createFolder(currentPath);
    }
  }

  redactSensitiveData(text: string): string {
    return text
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
      .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[redacted url]')
      .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[redacted phone]')
      .replace(/\b\d{1,5}\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Court|Ct|Place|Pl|Lane|Ln|Way|Terrace|Tce)\b/gi, '[redacted address]');
  }

  prepareTextForAI(text: string): string {
    return this.settings.redactSensitiveDataBeforeAI ? this.redactSensitiveData(text) : text;
  }

  getPersonalityContextForAI(): string {
    if (!this.settings.includePersonalityProfileInAI || !this.settings.personalityProfile) {
      return 'Personality profile: unavailable or not shared with AI';
    }

    const profile = this.settings.personalityProfile;
    return this.prepareTextForAI(`Personality profile:\n- Type: ${profile.psychological_type}\n- Dominant traits: ${profile.dominant_traits.join(', ')}\n- Growth areas: ${profile.growth_areas.join(', ')}`);
  }

  getAuthorMemoryContextForAI(): string {
    if (!this.settings.enableAuthorMemory) {
      return 'Existing author memory summary: disabled by user settings';
    }
    if (!this.settings.includeAuthorMemoryInAI) {
      return 'Existing author memory summary: stored locally but not shared with AI by user settings';
    }
    if (!this.settings.authorMemorySummary.trim()) {
      return 'Existing author memory summary: none yet';
    }

    return this.prepareTextForAI(`Existing author memory summary:\n${this.settings.authorMemorySummary.trim()}`);
  }

  getChatJournalContextForAI(journalContent: string): string {
    const prepared = this.prepareTextForAI(journalContent);
    if (this.settings.sendFullJournalToChat || prepared.length <= 4000) {
      return prepared;
    }

    return [
      'Journal entry excerpted for chat privacy. Full journal sharing is off in settings.',
      '',
      'Opening excerpt:',
      prepared.slice(0, 2000),
      '',
      'Closing excerpt:',
      prepared.slice(-2000)
    ].join('\n');
  }

  isSafeVaultMarkdownPath(path: string): boolean {
    return !!path
      && !path.startsWith('/')
      && !path.includes('\\')
      && !path.split('/').some((part) => part === '..')
      && path.toLowerCase().endsWith('.md');
  }

  getVaultMarkdownFile(path: string): TFile | null {
    if (!this.isSafeVaultMarkdownPath(path)) return null;
    const abstractFile = this.app.vault.getAbstractFileByPath(path);
    if (!(abstractFile instanceof TFile) || abstractFile.extension !== 'md') return null;
    return abstractFile;
  }

  openJournalModal() { new JournalEntryModal(this.app, this).open(); }
  openGoalModal() { new GoalModal(this.app, this).open(); }
  openPersonalityAssessment() { new PersonalityAssessmentModal(this.app, this).open(); }

  async activateDashboardView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD)[0];
    if (!leaf) { leaf = workspace.getRightLeaf(false)!; await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true }); }
    await workspace.revealLeaf(leaf);
  }

  async activateAIChatView() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_AI_CHAT)[0];
    let created = false;
    if (!leaf) {
      leaf = workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: VIEW_TYPE_AI_CHAT, active: true });
      created = true;
    }
    await workspace.revealLeaf(leaf);

    const view = leaf.view;
    if (!created && view instanceof AIChatView) {
      await view.onOpen();
    }
  }

  async analyzeCurrentNote(editor: Editor) {
    if (!this.openai) { new Notice('Please set your API key in settings'); return; }
    const content = editor.getValue();
    new Notice('Analyzing emotions with multiple perspectives...');
    try {
      const analysis = await this.getMultiPerspectiveAnalysis(content, (message) => {
        new Notice(message);
      });
      new AnalysisResultModal(this.app, this, analysis, content).open();
    } catch (error) {
      new Notice(this.getOpenAIErrorMessage(error, 'Error analyzing emotions'));
      console.error(error);
    }
  }

  async backfillAnalysisChatLinksForActiveFile(editor?: Editor) {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('Open a note with AI analysis first');
      return;
    }

    const resolvedEditor = editor || this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
    if (!resolvedEditor) {
      new Notice('Open the note in Markdown editing view first');
      return;
    }

    try {
      const content = resolvedEditor.getValue();
      const analysis = this.extractAnalysisPayloadFromNote(content);
      if (Object.keys(analysis.perspectives).length === 0) {
        new Notice('No AI analysis headings found in this note');
        return;
      }

      await this.ensurePerspectiveChatLinks(file, analysis);
      new Notice('Backfilled AI chat links for this note');
    } catch (error) {
      new Notice('Could not backfill analysis chat links');
      console.error(error);
    }
  }

  async getMultiPerspectiveAnalysis(content: string, onProgress?: AnalysisProgressCallback): Promise<AnalysisPayload> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const selectedPerspectiveKeys = new Set(this.settings.selectedPerspectives);
    const perspectives = getChronologicalPerspectiveKeys()
      .filter((key) => selectedPerspectiveKeys.has(key))
      .map((key) => ({ key, perspective: PERSPECTIVES[key] }))
      .filter((item) => item.perspective);

    if (perspectives.length === 0) {
      return {
        perspectives: {},
        furtherReadings: {},
        groupSyntheses: {},
        philosophicalReaccumulation: '',
        authorMemorySummary: this.settings.enableAuthorMemory ? this.settings.authorMemorySummary : '',
        goalSuggestions: [],
        analysisWarnings: []
      };
    }

    const analysisContent = await this.prepareJournalContentForAnalysis(this.prepareTextForAI(content), onProgress);
    const selectedGroupKeys = [...new Set(perspectives.map(({ perspective }) => perspective.group))]
      .filter((groupKey) => PERSPECTIVE_GROUPS[groupKey]);
    const personalityContext = this.getPersonalityContextForAI();
    const authorMemoryContext = this.getAuthorMemoryContextForAI();
    const readerContext = this.getReaderContextPrompt();
    const dateContext = this.getLocalDateContext();
    const results: Record<string, string> = {};
    const furtherReadings: Record<string, string[]> = {};
    const groupSyntheses: Record<string, string> = {};
    const analysisWarnings: string[] = [];
    const chronologicalChunks = this.chunkArray(perspectives, 4);

    for (let chunkIndex = 0; chunkIndex < chronologicalChunks.length; chunkIndex += 1) {
      const chunk = chronologicalChunks[chunkIndex];

      try {
        await onProgress?.(`Analyzing chronological sequence, batch ${chunkIndex + 1}/${chronologicalChunks.length}...`);
        const batchResult = await this.getChronologicalPerspectiveAnalysis(analysisContent, chunk, personalityContext, authorMemoryContext, readerContext);
        Object.assign(results, batchResult.perspectives);
        Object.assign(furtherReadings, batchResult.furtherReadings);
      } catch (error) {
        const warning = `Chronological batch ${chunkIndex + 1} could not be generated: ${this.getErrorMessage(error)}`;
        analysisWarnings.push(warning);
        console.error(error);
      }

      const missingPerspectives = chunk.filter(({ key }) => !results[key]);
      for (const item of missingPerspectives) {
        try {
          await onProgress?.(`Recovering omitted perspective: ${item.perspective.title}...`);
          const fallback = await this.getSingleGeneratedPerspectiveAnalysis(analysisContent, item.key, item.perspective, personalityContext, authorMemoryContext, readerContext);
          if (fallback.analysis) results[item.key] = fallback.analysis;
          if (fallback.furtherReadings.length > 0) furtherReadings[item.key] = fallback.furtherReadings;
        } catch (error) {
          const warning = `${item.perspective.title} could not be generated: ${this.getErrorMessage(error)}`;
          analysisWarnings.push(warning);
          console.error(error);
        }
      }
    }

    if (Object.keys(results).length === 0) {
      throw new Error('Analysis response did not include any usable perspectives');
    }

    for (let groupIndex = 0; groupIndex < selectedGroupKeys.length; groupIndex += 1) {
      const groupKey = selectedGroupKeys[groupIndex];
      const group = PERSPECTIVE_GROUPS[groupKey];
      const groupPerspectiveKeys = perspectives
        .filter(({ key, perspective }) => perspective.group === groupKey && !!results[key])
        .map(({ key }) => key);

      if (groupPerspectiveKeys.length === 0) continue;

      try {
        await onProgress?.(`Synthesizing ${group?.title || groupKey} lineage (${groupIndex + 1}/${selectedGroupKeys.length})...`);
        const groupSynthesis = await this.getLineageGroupSynthesis(analysisContent, groupKey, groupPerspectiveKeys, results, personalityContext, authorMemoryContext, readerContext);
        if (groupSynthesis) {
          groupSyntheses[groupKey] = groupSynthesis;
        }
      } catch (error) {
        const warning = `${group?.title || groupKey} lineage synthesis could not be generated: ${this.getErrorMessage(error)}`;
        analysisWarnings.push(warning);
        console.error(error);
      }
    }

    await onProgress?.('Synthesizing the full analysis and three proposed goals...');
    const synthesis = await this.getWholeAnalysisSynthesis(analysisContent, selectedGroupKeys, results, groupSyntheses, personalityContext, authorMemoryContext, readerContext, dateContext);
    const authorMemorySummary = this.settings.enableAuthorMemory
      ? synthesis.authorMemorySummary || this.settings.authorMemorySummary
      : '';

    if (this.settings.enableAuthorMemory && authorMemorySummary && authorMemorySummary !== this.settings.authorMemorySummary) {
      this.settings.authorMemorySummary = authorMemorySummary;
      await this.saveSettings();
    }

    return {
      perspectives: results,
      furtherReadings,
      groupSyntheses,
      philosophicalReaccumulation: synthesis.philosophicalReaccumulation,
      authorMemorySummary,
      goalSuggestions: synthesis.goalSuggestions,
      analysisWarnings
    };
  }

  chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  parseJsonObject(rawContent: string): Record<string, unknown> {
    const trimmed = rawContent.trim().replace(/^\uFEFF/, '');
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1]?.trim() || trimmed;
    const objectStart = fenced.indexOf('{');
    const objectEnd = fenced.lastIndexOf('}');
    const extracted = objectStart !== -1 && objectEnd > objectStart
      ? fenced.slice(objectStart, objectEnd + 1)
      : fenced;
    const withoutTrailingCommas = extracted.replace(/,\s*([}\]])/g, '$1');
    const quotedBareKeys = withoutTrailingCommas.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3');
    const candidates = [trimmed, fenced, extracted, withoutTrailingCommas, quotedBareKeys];
    let lastError: unknown = null;

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Could not parse JSON response');
  }

  async prepareJournalContentForAnalysis(content: string, onProgress?: AnalysisProgressCallback): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const maxDirectAnalysisChars = 12000;
    if (content.length <= maxDirectAnalysisChars) return content;

    await onProgress?.('Creating a compact analysis brief for this long journal entry...');
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        max_tokens: 2500,
        messages: [
          {
            role: 'system',
            content: 'You prepare faithful analysis briefs for long journal entries. Return valid JSON only.'
          },
          {
            role: 'user',
            content:
              `Create a compact but specific analysis brief for the journal entry below.\n\n` +
              `Return JSON with key analysis_brief. The brief must preserve concrete events, images, emotional turns, voice, repeated phrases, conflicts, questions, material conditions, relationships, and possible stakes. Do not diagnose. Do not flatten the author's style.\n\n` +
              `Journal entry:\n${content}`
          }
        ]
      });
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error('No analysis brief returned');
      const parsed = this.parseJsonObject(rawContent);
      const brief = typeof parsed.analysis_brief === 'string' ? parsed.analysis_brief.trim() : '';
      if (!brief) throw new Error('Analysis brief was empty');

      return [
        'Long journal entry analysis brief:',
        brief,
        '',
        'Opening excerpt from the original entry:',
        content.slice(0, 3000),
        '',
        'Closing excerpt from the original entry:',
        content.slice(-3000)
      ].join('\n');
    } catch (error) {
      console.error(error);
      await onProgress?.('Could not create a long-entry brief; analyzing opening and closing excerpts instead...');
      return [
        'Long journal entry excerpted for analysis because compact briefing failed.',
        '',
        'Opening excerpt:',
        content.slice(0, 6000),
        '',
        'Closing excerpt:',
        content.slice(-6000)
      ].join('\n');
    }
  }

  getReaderContextPrompt(): string {
    const level = ZPD_LEVELS[this.settings.zpdLevel] || ZPD_LEVELS.tertiary_year_2;
    return `Reader zone of proximal development: ${level.label}. ${level.prompt}`;
  }

  getOutputLanguagePrompt(): string {
    const language = OUTPUT_LANGUAGES[this.settings.outputLanguage] || OUTPUT_LANGUAGES.english;
    return [
      `Output language: ${language.label}. ${language.prompt}`,
      this.settings.outputLanguage === 'english'
        ? "Use Australian/British English preference where relevant. For the past tense of 'learn', use 'learnt', not 'learned'."
        : '',
      'Keep required JSON property names, enum values, exact perspective keys, file paths, and Markdown link targets exactly as requested by the app.'
    ].filter(Boolean).join(' ');
  }

  normalizeGeneratedEnglishUsage(text: string): string {
    if (!text || this.settings.outputLanguage !== 'english') return text;
    return text.replace(/\blearned\b/g, (match) => {
      if (match === 'LEARNED') return 'LEARNT';
      if (match === 'Learned') return 'Learnt';
      return 'learnt';
    });
  }

  normalizeGeneratedEnglishUsageArray(values: string[]): string[] {
    return values.map((value) => this.normalizeGeneratedEnglishUsage(value));
  }

  normalizeGeneratedEnglishUsageRecord(values: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, this.normalizeGeneratedEnglishUsage(value)])
    );
  }

  normalizeGeneratedFurtherReadings(values: Record<string, string[]>): Record<string, string[]> {
    return Object.fromEntries(
      Object.entries(values).map(([key, entries]) => [key, this.normalizeGeneratedEnglishUsageArray(entries)])
    );
  }

  getLocalDateContext(): string {
    const now = new Date();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local timezone';
    return [
      `Current local date: ${this.formatDateOnly(now)}`,
      `Current local date and time: ${now.toLocaleString()}`,
      `User timezone: ${timezone}`,
      'All generated goal targetDate values must be in YYYY-MM-DD format and must be today or a future date in the user timezone. Do not use dates before the current local date.'
    ].join('\n');
  }

  async getGroupPerspectiveAnalysis(
    content: string,
    groupKey: string,
    perspectives: { key: string; perspective: PerspectiveDefinition }[],
    personalityContext: string,
    authorMemoryContext: string,
    readerContext: string
  ): Promise<{ perspectives: Record<string, string>; furtherReadings: Record<string, string[]>; groupSynthesis: string }> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const group = PERSPECTIVE_GROUPS[groupKey];
    const perspectiveList = perspectives
      .map(({ key, perspective }) => `- ${buildPerspectivePromptDescriptor(key, perspective)}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 12000,
      messages: [
        {
          role: 'system',
          content:
            'You are an empathetic interdisciplinary analysis assistant. Return valid JSON only. ' +
            'Teach the analytic frame instead of name-dropping it. Produce useful outputs that can be shown directly in an app.'
        },
        {
          role: 'user',
          content:
            `Analyze the journal entry from every requested perspective in this group.\n\n` +
            `Return JSON with exactly these top-level keys:\n` +
            `- perspectives: an object where each key is the exact perspective key and each value is a string of 220-360 words.\n` +
            `- further_readings: an object where each key is the exact perspective key and each value is an array of 3-5 reading suggestions. Each suggestion should name an author and work, then briefly say why it helps with this frame.\n` +
            `- group_synthesis: a string of 260-420 words that synthesizes this group's individual analyses after they have all been explicated.\n\n` +
            `For each perspective:\n` +
            `- preserve the requested order. The order is intentionally arranged as a rough chronology, moving from earlier traditions toward more recent theories so the reader can see a progression in thought.\n` +
            `- create a synthetic interpretation of the entry through that frame, not a generic psychological reading.\n` +
            `- explain key terms in reader-friendly language and show how the interpretation was built from details, voice, images, tensions, or omissions in the entry.\n` +
            `- include interpretation, implication, likely outcome if the pattern continues, and a precise next step.\n` +
            `- empower the author, but also offer a fair critique where the frame warrants it.\n` +
            `- when a phrase like "pathway", "practice", "boundary", or "agency" appears, explain what it means materially and practically.\n` +
            `- use the supplied tradition, placement, chronology, and lineage markers as situating cues. They are guides to philosophical history, not rigid ownership claims.\n` +
            `- for Aristotle, include Rhetoric where relevant: ethos, pathos, logos, audience, persuasion, demonstration, causes, practical judgment, material conditions, and action.\n` +
            `- for Plato, avoid broad Platonism; show the specific dialectical movement, image, desire, education, appearance, or form being used.\n` +
            `- for self and subjectivity philosophers, distinguish self, person, subject, identity, agency, embodiment, autonomy, continuity, recognition, and responsibility. Teach the philosopher's method through the journal entry rather than turning every frame into ordinary psychology.\n` +
            `- for Gallagher's Pattern Theory of Self, map the entry across embodied, experiential, affective, intersubjective, narrative, extended, ecological, and normative dimensions without reducing the self to one single essence.\n` +
            `- for Australian Indigenous Philosophy Accumulated, respect Aboriginal and Torres Strait Islander knowledges as plural, living, sovereign, and tied to Country. Do not invent sacred or restricted knowledge. Work with public concepts such as Country, kinship, custodianship, relational obligation, story, survival, and settler-colonial pressure.\n` +
            `- for religious, mythic, and pagan interpretations, write comparatively and respectfully. Do not proselytize, pronounce divine judgment, or present one tradition as universally true. Interpret through the tradition's symbols, practices, sacred narratives, ethical tensions, and lived forms of meaning.\n` +
            `- for Marx, Bataille, Fanon, Habermas, Levinas, Nancy, Barad, moral naturalism, Leibniz, quantum theory, and songwriting, make the frame's distinctive method explicit rather than using only familiar keywords. Show what kind of evidence the frame treats as important.\n` +
            `- for Julia Kristeva, explain abjection, the semiotic, the symbolic, maternal borders, intertextuality, foreignness, and revolt through concrete details in the entry.\n` +
            `- for Maslow, Montessori, Piaget, and Vygotsky, interpret needs, development, learning, environment, scaffolding, independence, play, and social support as practical conditions, not abstract labels.\n` +
            `- for organisational transformation, connect culture, structure, leadership, resistance, capability, implementation, and sustained change to specific patterns in the entry.\n` +
            `- for Gregory Bateson, interpret communication, feedback loops, learning levels, double binds, relational patterns, and ecology of mind as systems that shape the entry's situation.\n` +
            `- for music songwriting, interpret the entry as potential song material: voice, rhythm, image, emotional arc, refrain, lyric tension, possible structure, and what a listener could feel.\n` +
            `- for Aesthetics, treat the term as contested rather than fixed. Explain whether the frame is operating through sensation (aisthesis), beauty, art, taste, judgment, or the distribution of the sensible, and why that sense fits this entry.\n` +
            `- for quantum theory and Barad, avoid fake scientific certainty. Use quantum concepts carefully as analytic models for measurement, relation, indeterminacy, apparatus, entanglement, and mattering.\n` +
            `- for Tessa Laird's Cinemal, read the entry through becoming-animal experimental film, sensory perception, nonhuman movement, colour, sound, voice, and more-than-human ecological imagination.\n` +
            `- for cartography and geography, interpret place, scale, orientation, borders, movement, landscape, and omission. Explain how maps and spatial thinking make some relations visible while hiding others.\n` +
            `- for sociology and social research methods, identify social structures, institutions, norms, groups, roles, evidence, ethics, positionality, fieldwork, and what kind of inquiry could test or deepen the interpretation.\n` +
            `- for parental guidance practices, avoid stereotypes. Explain each cultural frame as a situated set of practices and expectations, and compare guidance, care, discipline, autonomy, obligation, kinship, and social belonging materially.\n` +
            `- for legal, engineering, ecological, social-ecological, grounded theory, and autoethnographic frames, make the method visible: show what counts as evidence, what the frame notices, what it misses, and what practical consequence follows.\n` +
            `- avoid stopping early. Return one complete individual analysis for every requested key.\n\n` +
            `${personalityContext}\n\n` +
            `${authorMemoryContext}\n\n` +
            `${readerContext}\n\n` +
            `${this.getOutputLanguagePrompt()}\n\n` +
            `Perspective group: ${groupKey}: ${group?.title || groupKey} - ${group?.description || ''}\n\n` +
            `Requested perspectives in this group:\n${perspectiveList}\n\n` +
            `Journal entry:\n${content}`
        }
      ]
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) throw new Error('No analysis returned');

    const parsed = this.parseJsonObject(rawContent);
    const parsedPerspectives = parsed.perspectives && typeof parsed.perspectives === 'object'
      ? parsed.perspectives as Record<string, unknown>
      : {};
    const results: Record<string, string> = {};

    for (const { key } of perspectives) {
      const value = parsedPerspectives[key];
      if (typeof value === 'string' && value.trim()) {
        results[key] = value.trim();
      }
    }

    const parsedFurtherReadings = parsed.further_readings && typeof parsed.further_readings === 'object'
      ? parsed.further_readings as Record<string, unknown>
      : {};
    const furtherReadings: Record<string, string[]> = {};

    for (const { key } of perspectives) {
      const value = parsedFurtherReadings[key];
      if (Array.isArray(value)) {
        furtherReadings[key] = value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5);
      }
    }

    const groupSynthesis = typeof parsed.group_synthesis === 'string'
      ? this.normalizeGeneratedEnglishUsage(parsed.group_synthesis.trim())
      : '';

    return {
      perspectives: this.normalizeGeneratedEnglishUsageRecord(results),
      furtherReadings: this.normalizeGeneratedFurtherReadings(furtherReadings),
      groupSynthesis
    };
  }

  async getChronologicalPerspectiveAnalysis(
    content: string,
    perspectives: { key: string; perspective: PerspectiveDefinition }[],
    personalityContext: string,
    authorMemoryContext: string,
    readerContext: string
  ): Promise<{ perspectives: Record<string, string>; furtherReadings: Record<string, string[]> }> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const perspectiveList = perspectives
      .map(({ key, perspective }) => `- ${buildPerspectivePromptDescriptor(key, perspective)}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 11000,
      messages: [
        {
          role: 'system',
          content:
            'You are an empathetic interdisciplinary analysis assistant. Return valid JSON only. ' +
            'Teach each analytic frame instead of name-dropping it. Produce useful outputs that can be shown directly in an app.'
        },
        {
          role: 'user',
          content:
            `Analyze the journal entry from every requested perspective in this chronological batch.\n\n` +
            `Return JSON with exactly these top-level keys:\n` +
            `- perspectives: an object where each key is the exact perspective key and each value is a string of 220-360 words.\n` +
            `- further_readings: an object where each key is the exact perspective key and each value is an array of 3-5 reading suggestions. Each suggestion should name an author and work, then briefly say why it helps with this frame.\n\n` +
            `The requested order is strict chronology. Preserve the sequence exactly, even when adjacent perspectives come from different groups. Treat each group title as a lineage marker, not as the primary order.\n\n` +
            `For each perspective:\n` +
            `- create a synthetic interpretation of the entry through that frame, not a generic psychological reading.\n` +
            `- explain key terms in reader-friendly language and show how the interpretation was built from details, voice, images, tensions, or omissions in the entry.\n` +
            `- include interpretation, implication, likely outcome if the pattern continues, and a precise next step.\n` +
            `- empower the author, but also offer a fair critique where the frame warrants it.\n` +
            `- when a phrase like "pathway", "practice", "boundary", or "agency" appears, explain what it means materially and practically.\n` +
            `- for Aristotle, include Rhetoric where relevant: ethos, pathos, logos, audience, persuasion, demonstration, causes, practical judgment, material conditions, and action.\n` +
            `- for Plato, avoid broad Platonism; show the specific dialectical movement, image, desire, education, appearance, or form being used.\n` +
            `- for self and subjectivity philosophers, distinguish self, person, subject, identity, agency, embodiment, autonomy, continuity, recognition, and responsibility. Teach the philosopher's method through the journal entry rather than turning every frame into ordinary psychology.\n` +
            `- use the supplied tradition, placement, chronology, and lineage markers as situating cues. They are guides to philosophical history, not rigid ownership claims.\n` +
            `- for Gallagher's Pattern Theory of Self, map the entry across embodied, experiential, affective, intersubjective, narrative, extended, ecological, and normative dimensions without reducing the self to one single essence.\n` +
            `- for Australian Indigenous Philosophy Accumulated, respect Aboriginal and Torres Strait Islander knowledges as plural, living, sovereign, and tied to Country. Do not invent sacred or restricted knowledge. Work with public concepts such as Country, kinship, custodianship, relational obligation, story, survival, and settler-colonial pressure.\n` +
            `- for religious, mythic, and pagan interpretations, write comparatively and respectfully. Do not proselytize, pronounce divine judgment, or present one tradition as universally true. Interpret through the tradition's symbols, practices, sacred narratives, ethical tensions, and lived forms of meaning.\n` +
            `- for Marx, Bataille, Fanon, Habermas, Levinas, Nancy, Barad, moral naturalism, Leibniz, quantum theory, and songwriting, make the frame's distinctive method explicit rather than using only familiar keywords. Show what kind of evidence the frame treats as important.\n` +
            `- for Julia Kristeva, explain abjection, the semiotic, the symbolic, maternal borders, intertextuality, foreignness, and revolt through concrete details in the entry.\n` +
            `- for Maslow, Montessori, Piaget, and Vygotsky, interpret needs, development, learning, environment, scaffolding, independence, play, and social support as practical conditions, not abstract labels.\n` +
            `- for organisational transformation, connect culture, structure, leadership, resistance, capability, implementation, and sustained change to specific patterns in the entry.\n` +
            `- for Gregory Bateson, interpret communication, feedback loops, learning levels, double binds, relational patterns, and ecology of mind as systems that shape the entry's situation.\n` +
            `- for music songwriting, interpret the entry as potential song material: voice, rhythm, image, emotional arc, refrain, lyric tension, possible structure, and what a listener could feel.\n` +
            `- for Aesthetics, treat the term as contested rather than fixed. Explain whether the frame is operating through sensation (aisthesis), beauty, art, taste, judgment, or the distribution of the sensible, and why that sense fits this entry.\n` +
            `- for quantum theory and Barad, avoid fake scientific certainty. Use quantum concepts carefully as analytic models for measurement, relation, indeterminacy, apparatus, entanglement, and mattering.\n` +
            `- for Tessa Laird's Cinemal, read the entry through becoming-animal experimental film, sensory perception, nonhuman movement, colour, sound, voice, and more-than-human ecological imagination.\n` +
            `- for cartography and geography, interpret place, scale, orientation, borders, movement, landscape, and omission. Explain how maps and spatial thinking make some relations visible while hiding others.\n` +
            `- for sociology and social research methods, identify social structures, institutions, norms, groups, roles, evidence, ethics, positionality, fieldwork, and what kind of inquiry could test or deepen the interpretation.\n` +
            `- for parental guidance practices, avoid stereotypes. Explain each cultural frame as a situated set of practices and expectations, and compare guidance, care, discipline, autonomy, obligation, kinship, and social belonging materially.\n` +
            `- for legal, engineering, ecological, social-ecological, grounded theory, and autoethnographic frames, make the method visible: show what counts as evidence, what the frame notices, what it misses, and what practical consequence follows.\n` +
            `- avoid stopping early. Return one complete individual analysis for every requested key.\n\n` +
            `${personalityContext}\n\n` +
            `${authorMemoryContext}\n\n` +
            `${readerContext}\n\n` +
            `${this.getOutputLanguagePrompt()}\n\n` +
            `Requested perspectives in strict chronological order:\n${perspectiveList}\n\n` +
            `Journal entry:\n${content}`
        }
      ]
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) throw new Error('No analysis returned');

    const parsed = this.parseJsonObject(rawContent);
    const parsedPerspectives = parsed.perspectives && typeof parsed.perspectives === 'object'
      ? parsed.perspectives as Record<string, unknown>
      : {};
    const results: Record<string, string> = {};

    for (const { key } of perspectives) {
      const value = parsedPerspectives[key];
      if (typeof value === 'string' && value.trim()) {
        results[key] = value.trim();
      }
    }

    const parsedFurtherReadings = parsed.further_readings && typeof parsed.further_readings === 'object'
      ? parsed.further_readings as Record<string, unknown>
      : {};
    const furtherReadings: Record<string, string[]> = {};

    for (const { key } of perspectives) {
      const value = parsedFurtherReadings[key];
      if (Array.isArray(value)) {
        furtherReadings[key] = value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 5);
      }
    }

    return {
      perspectives: this.normalizeGeneratedEnglishUsageRecord(results),
      furtherReadings: this.normalizeGeneratedFurtherReadings(furtherReadings)
    };
  }

  async getLineageGroupSynthesis(
    content: string,
    groupKey: string,
    perspectiveKeys: string[],
    perspectiveAnalyses: Record<string, string>,
    personalityContext: string,
    authorMemoryContext: string,
    readerContext: string
  ): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const group = PERSPECTIVE_GROUPS[groupKey];
    const analysisList = perspectiveKeys
      .map((key) => {
        const title = PERSPECTIVES[key]?.title || key;
        const excerpt = (perspectiveAnalyses[key] || '').slice(0, 650);
        return `- ${title} (${key}): ${excerpt}`;
      })
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content:
            'You are an empathetic interdisciplinary analysis assistant. Write directly and do not include a heading.'
        },
        {
          role: 'user',
          content:
            `Synthesize this lineage group after the individual analyses have already been explicated.\n\n` +
            `Write 260-420 words. Chronology is the primary order of the whole analysis; this synthesis should use the group as a secondary lineage marker. Show how the perspectives in this group speak to one another, what they collectively reveal about the journal entry, where they disagree, what they make visible, what they miss, and what practical next movement follows.\n\n` +
            `${personalityContext}\n\n${authorMemoryContext}\n\n${readerContext}\n\n${this.getOutputLanguagePrompt()}\n\n` +
            `Group: ${groupKey}: ${group?.title || groupKey} - ${group?.description || ''}\n\n` +
            `Individual analysis excerpts from this group:\n${analysisList}\n\n` +
            `Journal entry:\n${content.slice(0, 6000)}`
        }
      ]
    });

    return this.normalizeGeneratedEnglishUsage(response.choices[0]?.message?.content?.trim() || '');
  }

  async getSingleGeneratedPerspectiveAnalysis(
    content: string,
    key: string,
    perspective: PerspectiveDefinition,
    personalityContext: string,
    authorMemoryContext: string,
    readerContext: string
  ): Promise<{ analysis: string; furtherReadings: string[] }> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 2500,
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic interdisciplinary analysis assistant. Return valid JSON only.'
        },
        {
          role: 'user',
          content:
            `The previous batch omitted this perspective. Analyze the journal entry through this exact frame.\n\n` +
            `Return JSON with keys analysis and further_readings.\n` +
            `- analysis must be 220-360 words, teach the frame, explain key terms, interpret the entry, show implications, predict likely outcomes, and give a precise next step.\n` +
            `- further_readings must be an array of 3-5 strings naming author/work and why it helps.\n\n` +
            `If the frame is Aesthetics, treat the term as contested rather than fixed. Explain whether the interpretation turns on sensation, beauty, art, taste, judgment, or the sensible, and why.\n\n` +
            `${personalityContext}\n\n${authorMemoryContext}\n\n${readerContext}\n\n` +
            `${this.getOutputLanguagePrompt()}\n\n` +
            `Perspective: ${buildPerspectivePromptDescriptor(key, perspective)}\n\n` +
            `Journal entry:\n${content}`
        }
      ]
    });
    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) return { analysis: '', furtherReadings: [] };
    const parsed = this.parseJsonObject(rawContent);
    const analysis = typeof parsed.analysis === 'string' ? this.normalizeGeneratedEnglishUsage(parsed.analysis.trim()) : '';
    const furtherReadings = Array.isArray(parsed.further_readings)
      ? this.normalizeGeneratedEnglishUsageArray(
          parsed.further_readings.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 5)
        )
      : [];
    return { analysis, furtherReadings };
  }

  async getWholeAnalysisSynthesis(
    content: string,
    selectedGroupKeys: string[],
    perspectives: Record<string, string>,
    groupSyntheses: Record<string, string>,
    personalityContext: string,
    authorMemoryContext: string,
    readerContext: string,
    dateContext: string
  ): Promise<{ philosophicalReaccumulation: string; authorMemorySummary: string; goalSuggestions: GoalSuggestion[] }> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const groupList = selectedGroupKeys
      .map((groupKey) => `- ${groupKey}: ${PERSPECTIVE_GROUPS[groupKey]?.title || groupKey}\n${groupSyntheses[groupKey] || 'No group synthesis returned.'}`)
      .join('\n\n');
    const perspectiveSummaries = Object.entries(perspectives)
      .map(([key, value]) => `- ${key}: ${value.slice(0, 700)}`)
      .join('\n');

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      max_tokens: 4500,
      messages: [
        {
          role: 'system',
          content: 'You are an empathetic interdisciplinary analysis assistant. Return valid JSON only.'
        },
        {
          role: 'user',
          content:
            `Synthesize the completed individual and group analyses of a journal entry.\n\n` +
            `Return JSON with exactly these keys:\n` +
            `- philosophical_reaccumulation: 360-520 words. Iteratively recombine the group syntheses into Philosophy as the first discipline. Treat this as an archeo-genealogical recombination of subdisciplines, theories, and analyses into an overarching philosophical orientation. Include interpretation, critique, implications, likely outcomes, further steps, and imaginative futures.\n` +
            `- author_memory_summary: under 220 words, updating enduring patterns, strengths, values, risks, supports, and recurring concerns.\n` +
            `- goal_suggestions: exactly 3 objects with keys title, description, category, targetDate, milestones, sourcePerspectives. These must synthesize the whole gamut of analytic frames into the three most salient next steps. Categories must be one of: ${Object.keys(GOAL_CATEGORIES).join(', ')}. targetDate must be YYYY-MM-DD and must be today or later in the user's timezone. When suggesting a form of activity, include concrete real-life examples of that form, such as types of groups, everyday actions, practices, scenes, public activities, mutual aid settings, study circles, creative routines, community organisations, or other realistic examples relevant to the journal entry. Mention other possible goals inside the descriptions as smaller intimations, not as extra goal objects.\n\n` +
            `${personalityContext}\n\n${authorMemoryContext}\n\n${readerContext}\n\n${dateContext}\n\n` +
            `${this.getOutputLanguagePrompt()}\n\n` +
            `Group syntheses:\n${groupList}\n\n` +
            `Individual analysis excerpts:\n${perspectiveSummaries}\n\n` +
            `Journal entry:\n${content}`
        }
      ]
    });
    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      return { philosophicalReaccumulation: '', authorMemorySummary: this.settings.authorMemorySummary, goalSuggestions: [] };
    }

    const parsed = this.parseJsonObject(rawContent);
    const philosophicalReaccumulation = typeof parsed.philosophical_reaccumulation === 'string'
      ? this.normalizeGeneratedEnglishUsage(parsed.philosophical_reaccumulation.trim())
      : '';
    const authorMemorySummary = typeof parsed.author_memory_summary === 'string'
      ? this.normalizeGeneratedEnglishUsage(parsed.author_memory_summary.trim())
      : this.settings.authorMemorySummary;
    const goalSuggestions = this.parseGoalSuggestions(parsed.goal_suggestions).slice(0, 3);

    return { philosophicalReaccumulation, authorMemorySummary, goalSuggestions };
  }

  parseGoalSuggestions(rawGoalSuggestions: unknown): GoalSuggestion[] {
    return (Array.isArray(rawGoalSuggestions) ? rawGoalSuggestions : [])
      .map((goal): GoalSuggestion | null => {
        if (!goal || typeof goal !== 'object') return null;
        const suggestion = goal as Record<string, unknown>;
        const title = typeof suggestion.title === 'string' ? this.normalizeGeneratedEnglishUsage(suggestion.title.trim()) : '';
        const description = typeof suggestion.description === 'string' ? this.normalizeGeneratedEnglishUsage(suggestion.description.trim()) : '';
        if (!title || !description) return null;

        const category = typeof suggestion.category === 'string' && GOAL_CATEGORIES[suggestion.category]
          ? suggestion.category
          : 'personal_growth';
        const rawTargetDate = typeof suggestion.targetDate === 'string' && suggestion.targetDate.trim()
          ? suggestion.targetDate.trim()
          : '';
        const targetDate = this.isUsableGoalTargetDate(rawTargetDate) ? rawTargetDate : '';
        const milestones = Array.isArray(suggestion.milestones)
          ? this.normalizeGeneratedEnglishUsageArray(
              suggestion.milestones.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
            )
          : [];
        const sourcePerspectives = Array.isArray(suggestion.sourcePerspectives)
          ? suggestion.sourcePerspectives.filter((item): item is string => typeof item === 'string').filter((item) => !!PERSPECTIVES[item])
          : [];

        return { title, description, category, targetDate, milestones, sourcePerspectives };
      })
      .filter((goal): goal is GoalSuggestion => !!goal);
  }

  async getSinglePerspectiveResponse(
    messages: ConversationMessage[],
    perspective: string,
    contextOverride?: { title?: string; description?: string }
  ): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    const persp = PERSPECTIVES[perspective];
    const authorContext = this.buildAuthorContext();
    const specializationTitle = contextOverride?.title?.trim() || persp?.title || 'reflective analysis';
    const specializationDescription = contextOverride?.description?.trim() || persp?.description || '';
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `You are an empathetic analytical companion specializing in ${specializationTitle}. ${specializationDescription}\n\n${this.getReaderContextPrompt()}\n\n${this.getOutputLanguagePrompt()}\n\nYou help users explore emotions, thoughts, experiences, contexts, and practical possibilities through this perspective or synthesis. Be warm, insightful, and supportive. Ask thoughtful follow-up questions. Keep responses conversational and under 150 words unless more detail is needed.${authorContext ? `\n\nContext about the journal author:\n${authorContext}` : ''}`
    };
    const conversation: ChatCompletionMessageParam[] = messages.map((message) => ({
      role: message.role,
      content: this.prepareTextForAI(message.content)
    }));
    const response = await this.openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [systemMessage, ...conversation] });
    return this.normalizeGeneratedEnglishUsage(
      response.choices[0]?.message?.content || 'I apologize, I could not generate a response.'
    );
  }

  async getRandomJournalPrompt(): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const goalStats = this.getGoalStats();
    const activeGoalFiles = goalStats.goals
      .filter((file) => this.app.metadataCache.getFileCache(file)?.frontmatter?.status !== 'completed')
      .slice(0, 8);
    const activeGoals = (await Promise.all(activeGoalFiles.map((file) => this.getGoalFileData(file))))
      .filter((goal): goal is GoalFileData => !!goal)
      .slice(0, 6);
    const recentJournalTitles = this.getJournalStats().recentEntries
      .slice(0, 6)
      .map((file) => this.getFileDisplayName(file.path));
    const goalContext = activeGoals.length > 0
      ? activeGoals
          .map((goal) => {
            const milestoneText = goal.milestones.slice(0, 3).join('; ') || 'No milestones recorded';
            return `- ${goal.title}: ${goal.description || 'No description'}. Milestones: ${milestoneText}`;
          })
          .join('\n')
      : 'No active goals available.';
    const journalContext = recentJournalTitles.length > 0
      ? recentJournalTitles.map((title) => `- ${title}`).join('\n')
      : 'No recent journal entries available.';
    const authorContext = this.buildAuthorContext() || 'No long-term author context available.';
    const preparedGoalContext = this.prepareTextForAI(goalContext);
    const preparedJournalContext = this.prepareTextForAI(journalContext);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'You generate one reflective journaling prompt at a time. ' +
            'The prompt should feel fresh, specific, emotionally intelligent, and motivating without sounding generic. ' +
            'Return plain text only, no markdown list, no title, no quotation marks.'
        },
        {
          role: 'user',
          content:
            `Create one random but grounded journaling prompt for this author.\n\n` +
            `Use the author context, active goals, milestones, and recent journal themes below. ` +
            `The prompt should help them write something meaningful today, ideally connecting to one or two live goals or milestones when relevant.\n\n` +
            `Requirements:\n` +
            `- 60 to 120 words\n` +
            `- direct second-person voice\n` +
            `- invite reflection, not analysis jargon\n` +
            `- include one concrete angle or scene to write from\n` +
            `- include one optional twist or follow-up question in the same paragraph\n` +
            `- do not mention goals or milestones mechanically\n\n` +
            `${this.getOutputLanguagePrompt()}\n\n` +
            `Author context:\n${authorContext}\n\n` +
            `Active goals:\n${preparedGoalContext}\n\n` +
            `Recent journal titles:\n${preparedJournalContext}`
        }
      ]
    });

    return this.normalizeGeneratedEnglishUsage(
      response.choices[0]?.message?.content?.trim() || 'Write about a moment today that quietly echoed one of your deeper goals, and follow that thread until it reveals what you most need right now.'
    );
  }

  async openChatFromSourceNote(sourceFilePath: string, perspectiveKey: string) {
    if (!PERSPECTIVES[perspectiveKey]) {
      throw new Error('Unknown analysis perspective');
    }
    const abstractFile = this.getVaultMarkdownFile(sourceFilePath);
    if (!abstractFile) {
      throw new Error('Source note not found');
    }

    const content = await this.app.vault.read(abstractFile);
    const analysis = this.extractAnalysisPayloadFromNote(content);
    const initialAnalysis = analysis.perspectives[perspectiveKey];
    if (!initialAnalysis) {
      throw new Error('Perspective analysis not found in source note');
    }

    this.pendingChatContext = {
      chatKind: 'perspective',
      perspective: perspectiveKey,
      journalContent: this.getJournalContentBeforeAnalysis(content),
      initialAnalysis,
      sourceFilePath,
      sourceTitle: PERSPECTIVES[perspectiveKey]?.title || perspectiveKey,
      sourceDescription: PERSPECTIVES[perspectiveKey]?.description || ''
    };

    await this.activateAIChatView();
  }

  getDefaultPerspectiveForGroup(groupKey: string): string {
    const firstPerspective = getChronologicalPerspectiveKeys()
      .find((key) => PERSPECTIVES[key]?.group === groupKey);
    return firstPerspective || 'lacanian_perspective';
  }

  async openGroupChatFromSourceNote(sourceFilePath: string, groupKey: string) {
    if (!PERSPECTIVE_GROUPS[groupKey]) {
      throw new Error('Unknown group synthesis');
    }
    const abstractFile = this.getVaultMarkdownFile(sourceFilePath);
    if (!abstractFile) {
      throw new Error('Source note not found');
    }

    const content = await this.app.vault.read(abstractFile);
    const bounds = this.findGroupSynthesisSectionBounds(content, groupKey);
    if (!bounds) {
      throw new Error('Group synthesis not found in source note');
    }

    const initialAnalysis = content.slice(bounds.start, bounds.end)
      .replace(/^###\s+.+$/m, '')
      .replace(/\*\*Continue Group Chat:\*\*.*(?:\n|$)/g, '')
      .replace(/\*\*Continue Chat:\*\*.*(?:\n|$)/g, '')
      .replace(/#### Latest AI Chat[\s\S]*$/m, '')
      .trim();
    const group = PERSPECTIVE_GROUPS[groupKey];

    this.pendingChatContext = {
      chatKind: 'group_synthesis',
      perspective: this.getDefaultPerspectiveForGroup(groupKey),
      journalContent: this.getJournalContentBeforeAnalysis(content),
      initialAnalysis,
      sourceFilePath,
      sourceGroupKey: groupKey,
      sourceTitle: `${group.title} synthesis`,
      sourceDescription: `${group.description}. This chat begins from the synthesis across the perspectives in this lineage group.`
    };

    await this.activateAIChatView();
  }

  async openGoalDraftsFromSourceNote(sourceFilePath: string) {
    const abstractFile = this.getVaultMarkdownFile(sourceFilePath);
    if (!abstractFile) {
      throw new Error('Source note not found');
    }

    const content = await this.app.vault.read(abstractFile);
    const drafts = this.extractGoalSuggestionsFromAnalysisNote(content, sourceFilePath);
    if (drafts.length === 0) {
      new Notice('No suggested goals found in this analysis note');
      return;
    }

    new GoalDraftsModal(this.app, this, drafts, sourceFilePath).open();
  }

  extractGoalSuggestionsFromAnalysisNote(content: string, sourceAnalysisPath: string = ''): GoalSuggestion[] {
    const suggestionsStart = content.search(/^##\s+.*Suggested Goals.*$/m);
    if (suggestionsStart === -1) return [];

    const suggestionsSection = content.slice(suggestionsStart);
    const nextSectionMatch = /^##\s+(?!.*Suggested Goals).*$/m.exec(suggestionsSection.slice(1));
    const boundedSection = nextSectionMatch
      ? suggestionsSection.slice(0, nextSectionMatch.index + 1)
      : suggestionsSection;
    const headingRegex = /^###\s+(.+)$/gm;
    const headingMatches: { title: string; index: number; fullMatch: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(boundedSection)) !== null) {
      headingMatches.push({ title: match[1].trim(), index: match.index, fullMatch: match[0] });
    }

    return headingMatches
      .map((heading, index): GoalSuggestion | null => {
        const bodyStart = heading.index + heading.fullMatch.length;
        const bodyEnd = index + 1 < headingMatches.length
          ? headingMatches[index + 1].index
          : boundedSection.length;
        const body = boundedSection.slice(bodyStart, bodyEnd).trim();
        const milestones = body
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith('- '))
          .map((line) => line.replace(/^- \[[ xX]\]\s*/, '').replace(/^- /, '').trim())
          .filter(Boolean);
        const description = body
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('- ') && !line.startsWith('**Draft Goals:**'))
          .join('\n')
          .trim();
        if (!heading.title || !description) return null;

        return {
          title: heading.title,
          description,
          category: 'personal_growth',
          targetDate: '',
          milestones,
          sourcePerspectives: [],
          sourceAnalysisPath
        };
      })
      .filter((goal): goal is GoalSuggestion => !!goal);
  }

  normalizeHeadingText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[*_`#]/g, '')
      .replace(/[^\p{L}\p{N}\s+]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getPerspectiveKeyForHeading(heading: string): string | null {
    const normalizedHeading = this.normalizeHeadingText(heading);

    for (const [key, perspective] of Object.entries(PERSPECTIVES)) {
      const normalizedTitle = this.normalizeHeadingText(perspective.title);
      const normalizedAliases = (PERSPECTIVE_HEADING_ALIASES[key] || [])
        .map((alias) => this.normalizeHeadingText(alias));
      if (normalizedHeading === normalizedTitle || normalizedAliases.some((alias) => normalizedHeading === alias)) {
        return key;
      }
    }

    for (const [key, perspective] of Object.entries(PERSPECTIVES)) {
      const normalizedTitle = this.normalizeHeadingText(perspective.title);
      const normalizedAliases = (PERSPECTIVE_HEADING_ALIASES[key] || [])
        .map((alias) => this.normalizeHeadingText(alias));
      if (
        normalizedHeading.includes(normalizedTitle) ||
        normalizedTitle.includes(normalizedHeading) ||
        normalizedAliases.some((alias) => normalizedHeading.includes(alias) || alias.includes(normalizedHeading))
      ) {
        return key;
      }
    }

    return null;
  }

  findAnalysisSectionStart(content: string): number {
    const analysisHeadingRegex = /^##\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = analysisHeadingRegex.exec(content)) !== null) {
      const headingText = this.normalizeHeadingText(match[1]);
      if (headingText.includes('ai analysis')) {
        return match.index;
      }
    }

    return -1;
  }

  getJournalContentBeforeAnalysis(content: string): string {
    const withoutFrontmatter = this.stripFrontmatter(content);
    const analysisStart = this.findAnalysisSectionStart(withoutFrontmatter);
    if (analysisStart === -1) {
      return withoutFrontmatter.trim();
    }

    return withoutFrontmatter.slice(0, analysisStart).trim();
  }

  findPerspectiveSectionBounds(content: string, perspectiveKey: string): { start: number; end: number } | null {
    const analysisStart = this.findAnalysisSectionStart(content);
    if (analysisStart === -1) return null;

    const analysisSection = content.slice(analysisStart);
    const headingMatches: { heading: string; index: number; fullMatch: string }[] = [];
    const headingRegex = /^###\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(analysisSection)) !== null) {
      headingMatches.push({
        heading: match[1].trim(),
        index: match.index,
        fullMatch: match[0]
      });
    }

    for (let index = 0; index < headingMatches.length; index += 1) {
      const currentHeading = headingMatches[index];
      const matchedPerspectiveKey = this.getPerspectiveKeyForHeading(currentHeading.heading);
      if (matchedPerspectiveKey !== perspectiveKey) continue;

      const start = analysisStart + currentHeading.index;
      const end = index + 1 < headingMatches.length
        ? analysisStart + headingMatches[index + 1].index
        : content.length;

      return { start, end };
    }

    return null;
  }

  findGroupSynthesisSectionBounds(content: string, groupKey: string): { start: number; end: number } | null {
    const group = PERSPECTIVE_GROUPS[groupKey];
    if (!group) return null;

    const groupSynthesesMatch = /^##\s+Group Syntheses\s*$/m.exec(content);
    if (!groupSynthesesMatch || typeof groupSynthesesMatch.index !== 'number') return null;

    const sectionStart = groupSynthesesMatch.index;
    const afterStart = content.slice(sectionStart);
    const nextSectionMatch = /^##\s+(?!Group Syntheses).+$/m.exec(afterStart.slice(groupSynthesesMatch[0].length));
    const sectionEnd = nextSectionMatch
      ? sectionStart + groupSynthesesMatch[0].length + nextSectionMatch.index
      : content.length;
    const sectionContent = content.slice(sectionStart, sectionEnd);
    const headingMatches: { heading: string; index: number; fullMatch: string }[] = [];
    const headingRegex = /^###\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(sectionContent)) !== null) {
      headingMatches.push({
        heading: match[1].trim(),
        index: match.index,
        fullMatch: match[0]
      });
    }

    for (let index = 0; index < headingMatches.length; index += 1) {
      const currentHeading = headingMatches[index];
      if (this.normalizeHeadingText(currentHeading.heading) !== this.normalizeHeadingText(group.title)) continue;

      const start = sectionStart + currentHeading.index;
      const end = index + 1 < headingMatches.length
        ? sectionStart + headingMatches[index + 1].index
        : sectionEnd;

      return { start, end };
    }

    return null;
  }

  buildPerspectiveChatLink(sourceFilePath: string, perspectiveKey: string): string {
    const encodedPath = encodeURIComponent(sourceFilePath);
    return `**Continue Chat:** [Open AI Chat](deleometer://chat?perspective=${perspectiveKey}&source=${encodedPath})`;
  }

  buildGroupSynthesisChatLink(sourceFilePath: string, groupKey: string): string {
    const encodedPath = encodeURIComponent(sourceFilePath);
    return `**Continue Group Chat:** [Open AI Chat](deleometer://chat?group=${groupKey}&source=${encodedPath})`;
  }

  extractAnalysisPayloadFromNote(content: string): AnalysisPayload {
    const perspectives: Record<string, string> = {};
    const analysisStart = this.findAnalysisSectionStart(content);
    if (analysisStart === -1) {
      return {
        perspectives,
        furtherReadings: {},
        groupSyntheses: {},
        philosophicalReaccumulation: '',
        authorMemorySummary: '',
        goalSuggestions: [],
        analysisWarnings: []
      };
    }

    const analysisSection = content.slice(analysisStart);
    const headingMatches: { heading: string; index: number; fullMatch: string }[] = [];
    const headingRegex = /^###\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(analysisSection)) !== null) {
      headingMatches.push({
        heading: match[1].trim(),
        index: match.index,
        fullMatch: match[0]
      });
    }

    for (let index = 0; index < headingMatches.length; index += 1) {
      const currentHeading = headingMatches[index];
      const headingText = currentHeading.heading;
      const perspectiveKey = this.getPerspectiveKeyForHeading(headingText);
      if (!perspectiveKey) continue;

      const bodyStart = currentHeading.index + currentHeading.fullMatch.length;
      const nextHeadingIndex = index + 1 < headingMatches.length
        ? headingMatches[index + 1].index
        : analysisSection.length;
      const sectionBody = analysisSection.slice(bodyStart, nextHeadingIndex)
        .replace(/\*\*Linked Chat:\*\*.*(?:\n|$)/g, '')
        .replace(/\*\*Start Chat:\*\*.*(?:\n|$)/g, '')
        .replace(/\*\*Continue Chat:\*\*.*(?:\n|$)/g, '')
        .replace(/#### Further readings[\s\S]*?(?=\n####|\n###|$)/g, '')
        .replace(/#### Latest AI Chat[\s\S]*$/m, '')
        .trim();

      if (sectionBody && !perspectives[perspectiveKey]) {
        perspectives[perspectiveKey] = sectionBody;
      }
    }

    return {
      perspectives,
      furtherReadings: {},
      groupSyntheses: {},
      philosophicalReaccumulation: '',
      authorMemorySummary: '',
      goalSuggestions: [],
      analysisWarnings: []
    };
  }

  getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    }
    return 'Unknown error';
  }

  getOpenAIErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const maybeError = error as {
        status?: number;
        message?: string;
        headers?: Record<string, string | null | undefined>;
      };
      if (maybeError.status === 429) {
        const retryAfter = this.getRetryAfterMessage(maybeError.headers);
        if (retryAfter) {
          return `⚠️ OpenAI rate limit reached. ${retryAfter}`;
        }

        return '⚠️ OpenAI quota exceeded. Reset time unavailable. Check your API billing/usage, then try again.';
      }
      if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
        return `❌ ${maybeError.message}`;
      }
    }

    return `❌ ${fallback}`;
  }

  getRetryAfterMessage(headers?: Record<string, string | null | undefined>): string | null {
    if (!headers) return null;

    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return `Try again in about ${Math.ceil(seconds)}s.`;
      }
    }

    const resetRequests = headers['x-ratelimit-reset-requests'];
    const resetTokens = headers['x-ratelimit-reset-tokens'];
    const candidate = resetRequests || resetTokens;
    if (!candidate) return null;

    const seconds = this.parseResetDurationSeconds(candidate);
    if (seconds === null) return null;

    return `Try again in about ${seconds}s.`;
  }

  parseResetDurationSeconds(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const directSeconds = Number(trimmed);
    if (!Number.isNaN(directSeconds) && directSeconds > 0) {
      return Math.ceil(directSeconds);
    }

    const durationMatch = trimmed.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/);
    if (!durationMatch) return null;

    const hours = Number(durationMatch[1] || 0);
    const minutes = Number(durationMatch[2] || 0);
    const seconds = Number(durationMatch[3] || 0);
    const totalSeconds = Math.ceil(hours * 3600 + minutes * 60 + seconds);

    return totalSeconds > 0 ? totalSeconds : null;
  }

  stripFrontmatter(content: string): string {
    if (!content.startsWith('---\n')) return content.trim();

    const frontmatterEnd = content.indexOf('\n---\n', 4);
    if (frontmatterEnd === -1) return content.trim();

    return content.slice(frontmatterEnd + 5).trim();
  }

  getPreferredPerspective(analysis: Record<string, string>): string | null {
    const preferred = this.settings.selectedPerspectives.find((perspective) => analysis[perspective]);
    if (preferred) return preferred;

    return Object.keys(analysis)[0] || null;
  }

  buildAuthorContext(): string {
    const parts: string[] = [];

    if (this.settings.enableAuthorMemory && this.settings.includeAuthorMemoryInAI && this.settings.authorMemorySummary.trim()) {
      parts.push(`Author memory summary: ${this.settings.authorMemorySummary.trim()}`);
    }

    if (this.settings.includePersonalityProfileInAI && this.settings.personalityProfile) {
      const profile = this.settings.personalityProfile;
      parts.push(
        `Personality profile: ${profile.psychological_type}. Dominant traits: ${profile.dominant_traits.join(', ')}. Growth areas: ${profile.growth_areas.join(', ')}.`
      );
    }

    return this.prepareTextForAI(parts.join('\n'));
  }

  escapeYamlString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  escapeYamlInlineString(value: string): string {
    return this.escapeYamlString(value.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim());
  }

  formatYamlStringArray(values: string[]): string {
    return `[${values.map((value) => `"${this.escapeYamlString(value)}"`).join(', ')}]`;
  }

  getWikiLinkTarget(path: string): string {
    return path.replace(/\.md$/i, '');
  }

  getFileDisplayName(path: string): string {
    const wikiTarget = this.getWikiLinkTarget(path);
    const parts = wikiTarget.split('/');
    return parts[parts.length - 1] || wikiTarget;
  }

  getPerspectiveHeadingTitle(perspectiveKey: string): string {
    return PERSPECTIVES[perspectiveKey]?.title || perspectiveKey;
  }

  sanitizeFileNamePart(value: string): string {
    const normalized = value
      .trim()
      .replace(/[[\\/:*?"<>|#^\]]+/g, ' ')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^\.+|\.+$/g, '');

    return normalized || 'journal';
  }

  getUniqueMarkdownPath(folder: string, baseName: string): string {
    let candidate = `${folder}/${baseName}.md`;
    let counter = 1;

    while (this.app.vault.getAbstractFileByPath(candidate)) {
      counter += 1;
      candidate = `${folder}/${baseName}-${counter}.md`;
    }

    return candidate;
  }

  getMarkdownFilesInFolderRecursive(folderPath: string): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) return [];

    const files: TFile[] = [];
    const walk = (current: TFolder) => {
      for (const child of current.children) {
        if (child instanceof TFile && child.extension === 'md') {
          files.push(child);
        } else if (child instanceof TFolder) {
          walk(child);
        }
      }
    };

    walk(folder);
    return files;
  }

  getOrCreateSplitLeaf(): WorkspaceLeaf {
    const splitLeaf = this.app.workspace.getLeaf('split', 'vertical');
    if (splitLeaf) return splitLeaf;
    return this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
  }

  async openFileInSplit(file: TFile) {
    const leaf = this.getOrCreateSplitLeaf();
    await leaf.openFile(file);
    await this.app.workspace.revealLeaf(leaf);
  }

  buildPerspectiveSourceNoteLink(sourceFilePath: string, perspectiveKey: string): string {
    const perspective = PERSPECTIVES[perspectiveKey];
    if (!perspective) {
      return `[[${this.getWikiLinkTarget(sourceFilePath)}|${this.getFileDisplayName(sourceFilePath)}]]`;
    }
    return `[[${this.getWikiLinkTarget(sourceFilePath)}#${perspective.title}|${perspective.title}]]`;
  }

  getGoalMilestoneFolderPath(goalFilePath: string, goalTitle: string): string {
    const baseName = this.sanitizeFileNamePart(this.getFileDisplayName(goalFilePath) || goalTitle || 'goal');
    return `${this.settings.milestonesFolder}/${baseName}`;
  }

  async saveGeneratedGoal(goal: GoalSuggestion): Promise<TFile> {
    await this.ensureFolder(this.settings.goalsFolder);
    const date = new Date();
    const safeTitle = this.sanitizeFileNamePart(goal.title);
    const fileName = this.getUniqueMarkdownPath(this.settings.goalsFolder, safeTitle);
    const description = this.escapeYamlInlineString(goal.description);
    const title = this.escapeYamlInlineString(goal.title);
    const sourcePerspectives = goal.sourcePerspectives.length ? goal.sourcePerspectives.join(', ') : 'AI synthesis';
    const sourceAnalysisPath = goal.sourceAnalysisPath ? this.escapeYamlString(goal.sourceAnalysisPath) : '';
    const wikiTarget = goal.sourceAnalysisPath ? this.getWikiLinkTarget(goal.sourceAnalysisPath) : '';
    const sourceAnalysisLabel = goal.sourceAnalysisPath ? this.getFileDisplayName(goal.sourceAnalysisPath) : '';
    const sourceAnalysisLink = wikiTarget ? `[[${wikiTarget}|${sourceAnalysisLabel}]]` : '';
    const sourcePerspectiveLinks = wikiTarget
      ? goal.sourcePerspectives
          .map((perspectiveKey) => {
            const perspective = PERSPECTIVES[perspectiveKey];
            if (!perspective) return '';
            return `[[${wikiTarget}#${perspective.title}|${perspective.title}]]`;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    const template = `---
type: goal
title: "${title}"
description: "${description}"
category: ${goal.category}
target_date: ${goal.targetDate || 'null'}
progress_percentage: 0
status: active
created: ${date.toISOString()}
source_perspectives: ${this.formatYamlStringArray(goal.sourcePerspectives)}
source_analysis_note: ${sourceAnalysisPath ? `"${sourceAnalysisPath}"` : 'null'}
milestones: ${this.formatYamlStringArray(goal.milestones)}
---

# 🎯 ${goal.title}

**Category:** ${GOAL_CATEGORIES[goal.category]}
**Target Date:** ${goal.targetDate || 'Not set'}
**Status:** Active
**Source Perspectives:** ${sourcePerspectives}
${sourceAnalysisLink ? `**Source Note:** ${sourceAnalysisLink}\n` : ''}${sourcePerspectiveLinks ? `**Derived From Analysis Types:** ${sourcePerspectiveLinks}\n` : ''}

## Description
${goal.description}

## Milestones
${goal.milestones.map((milestone) => `- [ ] ${milestone}`).join('\n') || '- [ ] Add first milestone'}

## Progress Notes

`;

    const file = await this.app.vault.create(fileName, template);
    await this.syncGoalMilestonesToFolder(file, true);
    const savedGoal = await this.getGoalFileData(file);
    if (savedGoal) {
      await this.app.vault.modify(file, this.buildStandardGoalNote(savedGoal));
      await this.updateGoalLinksInSourceAnalysis(savedGoal);
    }
    await this.syncGoalFileToFullCalendar(file);
    return file;
  }

  getMilestoneFolderFiles(): TFile[] {
    return this.getMarkdownFilesInFolderRecursive(this.settings.milestonesFolder);
  }

  getGoalOwnedMilestoneFiles(goalFilePath: string): TFile[] {
    return this.getMilestoneFolderFiles().filter((file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      return frontmatter?.deleometer_owner === 'deleometer'
        && typeof frontmatter.deleometer_goal_path === 'string'
        && frontmatter.deleometer_goal_path === goalFilePath;
    }).sort((a, b) => {
      const frontmatterA = this.app.metadataCache.getFileCache(a)?.frontmatter;
      const frontmatterB = this.app.metadataCache.getFileCache(b)?.frontmatter;
      const indexA = typeof frontmatterA?.deleometer_milestone_index === 'number'
        ? frontmatterA.deleometer_milestone_index
        : Number(frontmatterA?.deleometer_milestone_index || 0);
      const indexB = typeof frontmatterB?.deleometer_milestone_index === 'number'
        ? frontmatterB.deleometer_milestone_index
        : Number(frontmatterB?.deleometer_milestone_index || 0);
      return indexA - indexB;
    });
  }

  buildMilestoneNote(event: {
    title: string;
    description: string;
    targetDate?: string;
    goalFile: TFile;
    goalTitle: string;
    milestoneIndex: number;
    sourceAnalysisPath?: string;
    sourcePerspectives?: string[];
  }): string {
    const goalLink = `[[${this.getWikiLinkTarget(event.goalFile.path)}|${event.goalTitle}]]`;
    const sourceNoteLink = event.sourceAnalysisPath
      ? `[[${this.getWikiLinkTarget(event.sourceAnalysisPath)}|${this.getFileDisplayName(event.sourceAnalysisPath)}]]`
      : '';
    const sourceTypeLinks = event.sourceAnalysisPath && event.sourcePerspectives?.length
      ? event.sourcePerspectives
          .map((perspectiveKey) => {
            const perspective = PERSPECTIVES[perspectiveKey];
            if (!perspective) return '';
            return `[[${this.getWikiLinkTarget(event.sourceAnalysisPath!)}#${perspective.title}|${perspective.title}]]`;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    return `---
type: milestone
title: "${this.escapeYamlInlineString(event.title)}"
description: "${this.escapeYamlInlineString(event.description)}"
target_date: ${event.targetDate || 'null'}
status: active
created: ${new Date().toISOString()}
deleometer_owner: deleometer
deleometer_goal_path: "${this.escapeYamlString(event.goalFile.path)}"
deleometer_goal_title: "${this.escapeYamlString(event.goalTitle)}"
deleometer_milestone_index: ${event.milestoneIndex}
source_analysis_note: ${event.sourceAnalysisPath ? `"${this.escapeYamlString(event.sourceAnalysisPath)}"` : 'null'}
source_perspectives: ${this.formatYamlStringArray(event.sourcePerspectives || [])}
---

# ${event.title}

**Goal:** ${goalLink}
**Target Date:** ${event.targetDate || 'Not set'}
**Status:** Active
${sourceNoteLink ? `**Source Note:** ${sourceNoteLink}\n` : ''}${sourceTypeLinks ? `**Derived From:** ${sourceTypeLinks}\n` : ''}

## Description
${event.description}

## Notes

`;
  }

  async upsertGoalMilestoneNote(existingFile: TFile | null, event: {
    title: string;
    description: string;
    targetDate?: string;
    goalFile: TFile;
    goalTitle: string;
    milestoneIndex: number;
    sourceAnalysisPath?: string;
    sourcePerspectives?: string[];
  }): Promise<TFile> {
    const milestoneFolderPath = this.getGoalMilestoneFolderPath(event.goalFile.path, event.goalTitle);
    await this.ensureFolder(milestoneFolderPath);

    if (existingFile) {
      const content = await this.app.vault.cachedRead(existingFile);
      const looseFrontmatter = this.parseLooseFrontmatter(content);
      const cachedFrontmatter = this.app.metadataCache.getFileCache(existingFile)?.frontmatter;
      const frontmatter = looseFrontmatter && cachedFrontmatter
        ? { ...looseFrontmatter, ...cachedFrontmatter }
        : (cachedFrontmatter || looseFrontmatter);
      if (frontmatter?.status === 'merged' || frontmatter?.deleometer_consolidated === true) {
        return existingFile;
      }
    }

    const note = this.buildMilestoneNote(event);
    if (existingFile) {
      const desiredPath = `${milestoneFolderPath}/${this.sanitizeFileNamePart(`Milestone ${event.milestoneIndex} ${event.goalTitle}`)}.md`;
      if (existingFile.path !== desiredPath && !this.app.vault.getAbstractFileByPath(desiredPath)) {
        await this.app.fileManager.renameFile(existingFile, desiredPath);
        const renamed = this.getVaultMarkdownFile(desiredPath);
        if (renamed) existingFile = renamed;
      }
      await this.app.vault.modify(existingFile, note);
      return existingFile;
    }

    const path = this.getUniqueMarkdownPath(
      milestoneFolderPath,
      this.sanitizeFileNamePart(`Milestone ${event.milestoneIndex} ${event.goalTitle}`)
    );
    return await this.app.vault.create(path, note);
  }

  async deleteGoalMilestoneNotes(goalFile: TFile) {
    const files = this.getGoalOwnedMilestoneFiles(goalFile.path);
    for (const file of files) {
      await this.app.fileManager.trashFile(file);
    }
  }

  async syncGoalMilestonesToFolder(goalFile: TFile, _force: boolean = false): Promise<boolean> {
    if (!this.settings.milestonesFolder?.trim()) return false;

    const goal = await this.getGoalFileData(goalFile);
    if (!goal) return false;

    await this.ensureFolder(this.settings.milestonesFolder);
    await this.ensureFolder(this.getGoalMilestoneFolderPath(goal.file.path, goal.title));

    const existingFiles = this.getGoalOwnedMilestoneFiles(goalFile.path);
    const byIndex = new Map<number, TFile>();
    for (const file of existingFiles) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const index = typeof frontmatter?.deleometer_milestone_index === 'number'
        ? frontmatter.deleometer_milestone_index
        : (typeof frontmatter?.deleometer_milestone_index === 'string' ? Number(frontmatter.deleometer_milestone_index) : NaN);
      if (Number.isFinite(index)) byIndex.set(index, file);
    }

    const expectedIndexes = new Set<number>();
    const milestoneDates = this.getScheduledMilestoneDates(goal.targetDate, goal.created, goal.milestones.length);
    for (let index = 0; index < goal.milestones.length; index += 1) {
      const milestoneIndex = index + 1;
      const milestoneText = goal.milestones[index];
      expectedIndexes.add(milestoneIndex);
      await this.upsertGoalMilestoneNote(byIndex.get(milestoneIndex) || null, {
        title: milestoneText,
        description: `Milestone ${milestoneIndex} for ${goal.title}`,
        targetDate: milestoneDates[index],
        goalFile,
        goalTitle: goal.title,
        milestoneIndex,
        sourceAnalysisPath: goal.sourceAnalysisPath,
        sourcePerspectives: goal.sourcePerspectives
      });
    }

    for (const [index, file] of Array.from(byIndex.entries())) {
      if (!expectedIndexes.has(index)) {
        await this.app.fileManager.trashFile(file);
      }
    }

    return true;
  }

  async syncAllGoalMilestonesToFolder(showNotice: boolean = false) {
    const goalStats = this.getGoalStats();
    let synced = 0;

    for (const goalFile of goalStats.goals) {
      const result = await this.syncGoalMilestonesToFolder(goalFile, true);
      if (result) synced += 1;
    }

    if (showNotice) {
      new Notice(`Synced milestones from ${synced} goal${synced === 1 ? '' : 's'} to folder`);
    }
  }

  async getMilestoneFileData(milestoneFile: TFile): Promise<MilestoneFileData | null> {
    const content = await this.app.vault.cachedRead(milestoneFile);
    const frontmatter = this.app.metadataCache.getFileCache(milestoneFile)?.frontmatter || this.parseLooseFrontmatter(content);
    if (!frontmatter) return null;

    const type = typeof frontmatter.type === 'string' ? frontmatter.type : '';
    const isOwnedMilestone = frontmatter.deleometer_owner === 'deleometer' && typeof frontmatter.deleometer_goal_path === 'string';
    if (type !== 'milestone' && !isOwnedMilestone) return null;

    const title = typeof frontmatter.title === 'string' && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : milestoneFile.basename;
    const frontmatterDescription = typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '';
    const description = frontmatterDescription || this.extractGoalSection(content, 'Description');
    const targetDate = this.isValidDateString(frontmatter.target_date) ? frontmatter.target_date.trim() : undefined;
    const goalPath = typeof frontmatter.deleometer_goal_path === 'string' ? frontmatter.deleometer_goal_path : undefined;
    const goalTitle = typeof frontmatter.deleometer_goal_title === 'string' ? frontmatter.deleometer_goal_title : undefined;
    const rawIndex = typeof frontmatter.deleometer_milestone_index === 'number'
      ? frontmatter.deleometer_milestone_index
      : (typeof frontmatter.deleometer_milestone_index === 'string' ? Number(frontmatter.deleometer_milestone_index) : NaN);
    const sourcePerspectives = Array.isArray(frontmatter.source_perspectives)
      ? frontmatter.source_perspectives.filter((item): item is string => typeof item === 'string')
      : [];

    return {
      file: milestoneFile,
      title,
      description,
      targetDate,
      goalPath,
      goalTitle,
      milestoneIndex: Number.isFinite(rawIndex) ? rawIndex : undefined,
      status: typeof frontmatter.status === 'string' ? frontmatter.status : 'active',
      created: typeof frontmatter.created === 'string' ? frontmatter.created : new Date(milestoneFile.stat.ctime).toISOString(),
      sourceAnalysisPath: typeof frontmatter.source_analysis_note === 'string' ? frontmatter.source_analysis_note : undefined,
      sourcePerspectives
    };
  }

  getMilestoneSimilarityTokens(value: string): string[] {
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'your', 'this', 'that', 'about', 'through', 'more', 'than', 'have', 'will', 'goal', 'goals', 'milestone', 'milestones', 'practice', 'develop', 'create']);
    return this.normalizeGoalText(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !stopWords.has(token));
  }

  getMilestoneSimilarityScore(left: MilestoneFileData, right: MilestoneFileData): number {
    const leftText = `${left.title} ${left.description} ${left.goalTitle || ''}`;
    const rightText = `${right.title} ${right.description} ${right.goalTitle || ''}`;
    const leftTokens = new Set(this.getMilestoneSimilarityTokens(leftText));
    const rightTokens = new Set(this.getMilestoneSimilarityTokens(rightText));
    if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

    const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token));
    const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]);
    const jaccard = shared.length / union.size;
    const normalizedLeftTitle = this.normalizeGoalText(left.title);
    const normalizedRightTitle = this.normalizeGoalText(right.title);
    const titleIncludes = normalizedLeftTitle.length > 0 && normalizedRightTitle.length > 0
      && (normalizedLeftTitle.includes(normalizedRightTitle) || normalizedRightTitle.includes(normalizedLeftTitle));
    const sameGoal = !!left.goalPath && left.goalPath === right.goalPath;

    if (sameGoal && shared.length > 0) return Math.max(jaccard, 0.5);
    return titleIncludes ? Math.max(jaccard, 0.62) : jaccard;
  }

  buildMilestoneMergeDraft(milestones: MilestoneFileData[]): MilestoneMergeDraft {
    const sorted = [...milestones].sort((a, b) => b.title.length - a.title.length);
    const primary = sorted[0];
    const descriptions = Array.from(new Set(milestones.map((milestone) => milestone.description.trim()).filter(Boolean)));
    const targetDates = milestones.map((milestone) => milestone.targetDate).filter((value): value is string => !!value).sort();
    const goalPairs: { path: string; title: string }[] = [];
    for (const milestone of milestones) {
      if (!milestone.goalPath || goalPairs.some((pair) => pair.path === milestone.goalPath)) continue;
      goalPairs.push({ path: milestone.goalPath, title: milestone.goalTitle || this.getFileDisplayName(milestone.goalPath) });
    }
    const sourcePerspectives = Array.from(new Set(milestones.flatMap((milestone) => milestone.sourcePerspectives)));
    const sourceAnalysisPath = milestones.find((milestone) => milestone.sourceAnalysisPath)?.sourceAnalysisPath;

    return {
      sourceMilestones: milestones.sort((a, b) => a.title.localeCompare(b.title)),
      mergedTitle: primary.title,
      mergedDescription: descriptions.join('\n\n'),
      mergedTargetDate: targetDates[0],
      mergedGoalPaths: goalPairs.map((pair) => pair.path),
      mergedGoalTitles: goalPairs.map((pair) => pair.title),
      mergedSourceAnalysisPath: sourceAnalysisPath,
      mergedSourcePerspectives: sourcePerspectives
    };
  }

  async getMilestoneConsolidationDrafts(): Promise<MilestoneMergeDraft[]> {
    await this.syncAllGoalMilestonesToFolder(false);
    const milestones = (await Promise.all(this.getMilestoneFolderFiles().map((file) => this.getMilestoneFileData(file))))
      .filter((milestone): milestone is MilestoneFileData => !!milestone)
      .filter((milestone) => milestone.status !== 'completed' && milestone.status !== 'merged');

    const visited = new Set<string>();
    const drafts: MilestoneMergeDraft[] = [];

    for (const milestone of milestones) {
      if (visited.has(milestone.file.path)) continue;
      const group = [milestone];
      visited.add(milestone.file.path);

      for (const candidate of milestones) {
        if (visited.has(candidate.file.path)) continue;
        if (this.getMilestoneSimilarityScore(milestone, candidate) >= 0.42) {
          group.push(candidate);
          visited.add(candidate.file.path);
        }
      }

      if (group.length < 2) continue;
      drafts.push(this.buildMilestoneMergeDraft(group));
    }

    return drafts;
  }

  buildMergedMilestoneNote(draft: MilestoneMergeDraft): string {
    const primary = [...draft.sourceMilestones].sort((a, b) => a.file.path.localeCompare(b.file.path))[0];
    const created = draft.sourceMilestones
      .map((milestone) => milestone.created)
      .filter(Boolean)
      .sort()[0] || new Date().toISOString();
    const sourceLinks = draft.sourceMilestones
      .map((milestone) => `- [[${this.getWikiLinkTarget(milestone.file.path)}|${milestone.title}]]`)
      .join('\n');
    const goalLinks = draft.mergedGoalPaths
      .map((goalPath, index) => {
        const label = draft.mergedGoalTitles[index] || this.getFileDisplayName(goalPath);
        return `- [[${this.getWikiLinkTarget(goalPath)}|${label}]]`;
      })
      .join('\n');
    const sourceNoteLink = draft.mergedSourceAnalysisPath
      ? `[[${this.getWikiLinkTarget(draft.mergedSourceAnalysisPath)}|${this.getFileDisplayName(draft.mergedSourceAnalysisPath)}]]`
      : '';
    const sourcePerspectiveLinks = draft.mergedSourceAnalysisPath
      ? draft.mergedSourcePerspectives
          .map((perspectiveKey) => {
            const perspective = PERSPECTIVES[perspectiveKey];
            if (!perspective) return '';
            return `[[${this.getWikiLinkTarget(draft.mergedSourceAnalysisPath!)}#${perspective.title}|${perspective.title}]]`;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    return `---
type: milestone
title: "${this.escapeYamlInlineString(draft.mergedTitle)}"
description: "${this.escapeYamlInlineString(draft.mergedDescription)}"
target_date: ${draft.mergedTargetDate || 'null'}
status: active
created: ${created}
deleometer_owner: deleometer
deleometer_consolidated: true
deleometer_goal_path: ${primary?.goalPath ? `"${this.escapeYamlString(primary.goalPath)}"` : 'null'}
deleometer_goal_title: ${primary?.goalTitle ? `"${this.escapeYamlString(primary.goalTitle)}"` : 'null'}
deleometer_milestone_index: ${typeof primary?.milestoneIndex === 'number' ? primary.milestoneIndex : 'null'}
source_goal_paths: ${this.formatYamlStringArray(draft.mergedGoalPaths)}
source_goal_titles: ${this.formatYamlStringArray(draft.mergedGoalTitles)}
source_perspectives: ${this.formatYamlStringArray(draft.mergedSourcePerspectives)}
source_analysis_note: ${draft.mergedSourceAnalysisPath ? `"${this.escapeYamlString(draft.mergedSourceAnalysisPath)}"` : 'null'}
merged_from: ${this.formatYamlStringArray(draft.sourceMilestones.map((milestone) => milestone.file.path))}
---

# ${draft.mergedTitle}

**Target Date:** ${draft.mergedTargetDate || 'Not set'}
**Status:** Active
${sourceNoteLink ? `**Source Note:** ${sourceNoteLink}\n` : ''}${sourcePerspectiveLinks ? `**Derived From Analysis Types:** ${sourcePerspectiveLinks}\n` : ''}

## Description
${draft.mergedDescription}

${goalLinks ? `## Related Goals\n${goalLinks}\n\n` : ''}## Merged From Milestones
${sourceLinks}

## Notes

`;
  }

  buildMergedMilestoneSourceNote(targetMilestonePath: string, mergedTitle: string, looseFrontmatter?: Record<string, unknown>): string {
    const created = typeof looseFrontmatter?.created === 'string' ? `created: ${looseFrontmatter.created}\n` : '';
    const goalPath = typeof looseFrontmatter?.deleometer_goal_path === 'string'
      ? `deleometer_goal_path: "${this.escapeYamlString(looseFrontmatter.deleometer_goal_path)}"\n`
      : '';
    const goalTitle = typeof looseFrontmatter?.deleometer_goal_title === 'string'
      ? `deleometer_goal_title: "${this.escapeYamlString(looseFrontmatter.deleometer_goal_title)}"\n`
      : '';
    const rawIndex = typeof looseFrontmatter?.deleometer_milestone_index === 'number'
      ? looseFrontmatter.deleometer_milestone_index
      : (typeof looseFrontmatter?.deleometer_milestone_index === 'string' ? Number(looseFrontmatter.deleometer_milestone_index) : NaN);
    const milestoneIndex = Number.isFinite(rawIndex) ? `deleometer_milestone_index: ${rawIndex}\n` : '';
    return `---
type: milestone
status: merged
merged_into: "${this.escapeYamlInlineString(targetMilestonePath)}"
deleometer_owner: deleometer
${goalPath}${goalTitle}${milestoneIndex}
${created}
---

# Milestone Merged

This milestone has been consolidated into [[${this.getWikiLinkTarget(targetMilestonePath)}|${mergedTitle}]].
`;
  }

  async consolidateMilestoneDrafts(drafts: MilestoneMergeDraft[]) {
    let mergedCount = 0;

    for (const draft of drafts) {
      if (draft.sourceMilestones.length < 2) continue;

      const sortedMilestones = [...draft.sourceMilestones].sort((a, b) => a.file.path.localeCompare(b.file.path));
      const primary = sortedMilestones[0];
      const primaryFile = primary.file;

      await this.app.vault.modify(primaryFile, this.buildMergedMilestoneNote(draft));

      for (const duplicate of sortedMilestones.slice(1)) {
        const content = await this.app.vault.cachedRead(duplicate.file);
        await this.app.vault.modify(
          duplicate.file,
          this.buildMergedMilestoneSourceNote(primaryFile.path, draft.mergedTitle, this.parseLooseFrontmatter(content) || undefined)
        );
      }

      mergedCount += 1;
    }

    if (mergedCount > 0) {
      new Notice(`Consolidated ${mergedCount} similar milestone group${mergedCount === 1 ? '' : 's'}`);
    }
  }

  async openMilestoneConsolidationModal() {
    const drafts = await this.getMilestoneConsolidationDrafts();
    if (drafts.length === 0) {
      new Notice('No similar milestone groups found');
      return;
    }
    new MilestoneConsolidationModal(this.app, this, drafts).open();
  }

  isValidDateString(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
  }

  isUsableGoalTargetDate(value: string): boolean {
    if (!this.isValidDateString(value)) return false;
    const today = this.parseDateOnly(this.formatDateOnly(new Date()));
    const target = this.parseDateOnly(value);
    return target.getTime() >= today.getTime();
  }

  parseDateOnly(value: string): Date {
    return new Date(`${value}T00:00:00`);
  }

  formatDateOnly(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  async getGoalCalendarData(goalFile: TFile): Promise<{
    title: string;
    targetDate?: string;
    milestones: string[];
    created: string;
    sourceAnalysisPath?: string;
    sourcePerspectives: string[];
  } | null> {
    const goal = await this.getGoalFileData(goalFile);
    if (!goal) return null;

    return {
      title: goal.title,
      targetDate: goal.targetDate,
      milestones: goal.milestones,
      created: goal.created,
      sourceAnalysisPath: goal.sourceAnalysisPath,
      sourcePerspectives: goal.sourcePerspectives
    };
  }

  async getGoalFileData(goalFile: TFile): Promise<GoalFileData | null> {
    const content = await this.app.vault.cachedRead(goalFile);
    let frontmatter = this.app.metadataCache.getFileCache(goalFile)?.frontmatter;
    const looseFrontmatter = this.parseLooseFrontmatter(content);
    if (!frontmatter && looseFrontmatter) {
      frontmatter = looseFrontmatter;
    } else if (frontmatter && looseFrontmatter) {
      frontmatter = { ...looseFrontmatter, ...frontmatter };
    }
    if (!frontmatter || !this.isGoalFile(goalFile)) return null;

    const title = typeof frontmatter.title === 'string' && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : goalFile.basename;
    const description = typeof frontmatter.description === 'string' && frontmatter.description.trim()
      ? frontmatter.description.trim()
      : this.extractGoalSection(content, 'Description') || '';
    const category = typeof frontmatter.category === 'string' && Object.prototype.hasOwnProperty.call(GOAL_CATEGORIES, frontmatter.category)
      ? frontmatter.category
      : 'personal_growth';
    const targetDate = this.isValidDateString(frontmatter.target_date) ? frontmatter.target_date : undefined;
    const created = typeof frontmatter.created === 'string' && frontmatter.created
      ? frontmatter.created
      : goalFile.stat.ctime ? new Date(goalFile.stat.ctime).toISOString() : new Date().toISOString();
    const sourceAnalysisPath = typeof frontmatter.source_analysis_note === 'string' && frontmatter.source_analysis_note.trim()
      ? frontmatter.source_analysis_note.trim()
      : undefined;
    const sourcePerspectives = Array.isArray(frontmatter.source_perspectives)
      ? frontmatter.source_perspectives.filter((item): item is string => typeof item === 'string')
      : [];
    const status = typeof frontmatter.status === 'string' ? frontmatter.status : 'active';

    let milestones = Array.isArray(frontmatter.milestones)
      ? frontmatter.milestones.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
      : [];

    if (milestones.length === 0) {
      milestones = this.extractGoalChecklist(content, 'Milestones');
    }

    return { file: goalFile, title, description, category, targetDate, milestones, created, sourceAnalysisPath, sourcePerspectives, status };
  }

  getFrontmatterBlock(content: string): string | null {
    if (!content.startsWith('---\n')) return null;
    const frontmatterEnd = content.indexOf('\n---\n', 4);
    if (frontmatterEnd === -1) return null;
    return content.slice(4, frontmatterEnd);
  }

  parseLooseFrontmatterValue(key: string, rawValue: string): unknown {
    const value = rawValue.trim();
    if (!value) return '';

    try {
      const parsed: unknown = parseYaml(`${key}: ${value}`);
      if (parsed && typeof parsed === 'object' && key in parsed) {
        return (parsed as Record<string, unknown>)[key];
      }
    } catch {
      // Fall through to the looser string-based parser below.
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    if (value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  }

  parseLooseFrontmatter(content: string): Record<string, unknown> | null {
    const block = this.getFrontmatterBlock(content);
    if (!block) return null;

    const lines = block.split('\n');
    const frontmatter: Record<string, unknown> = {};

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      frontmatter[key] = this.parseLooseFrontmatterValue(key, rawValue);

      if (rawValue.startsWith('"') && !rawValue.endsWith('"')) {
        while (index + 1 < lines.length && !/^[A-Za-z_][A-Za-z0-9_]*:\s*/.test(lines[index + 1])) {
          index += 1;
        }
      }
    }

    return frontmatter;
  }

  extractGoalSection(content: string, heading: string): string {
    const pattern = new RegExp(`\\n##(?:#+)?\\s+[\\d.]*\\s*${heading}\\b[.:]?([\\s\\S]*?)(?:\\n##(?:#+)?\\s+|\\n#\\s+|$)`, 'i');
    const match = content.match(pattern);
    return match?.[1]?.trim() || '';
  }

  extractGoalChecklist(content: string, heading: string): string[] {
    const section = this.extractGoalSection(content, heading);
    if (!section) return [];
    return section
      .split('\n')
      .map((line) => line.match(/^\s*-\s+\[[ xX]\]\s+(.+?)\s*$/)?.[1]?.trim() || line.match(/^\s*-\s+(.+?)\s*$/)?.[1]?.trim() || '')
      .filter(Boolean);
  }

  normalizeGoalText(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  getGoalSimilarityTokens(value: string): string[] {
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'your', 'this', 'that', 'about', 'through', 'more', 'than', 'have', 'will', 'goal', 'practice', 'develop']);
    return this.normalizeGoalText(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 3 && !stopWords.has(token));
  }

  getGoalSimilarityScore(left: GoalFileData, right: GoalFileData): number {
    const leftTokens = new Set(this.getGoalSimilarityTokens(`${left.title} ${left.description}`));
    const rightTokens = new Set(this.getGoalSimilarityTokens(`${right.title} ${right.description}`));
    if (leftTokens.size === 0 || rightTokens.size === 0) return 0;

    const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token));
    const union = new Set([...Array.from(leftTokens), ...Array.from(rightTokens)]);
    const jaccard = shared.length / union.size;
    const titleIncludes = this.normalizeGoalText(left.title).includes(this.normalizeGoalText(right.title))
      || this.normalizeGoalText(right.title).includes(this.normalizeGoalText(left.title));

    if (shared.some((token) => token.includes('mindful') || token.includes('mindfulness'))) {
      return Math.max(jaccard, 0.7);
    }

    return titleIncludes ? Math.max(jaccard, 0.6) : jaccard;
  }

  async getConsolidationDrafts(): Promise<GoalMergeDraft[]> {
    const goalStats = this.getGoalStats();
    const goals = (await Promise.all(goalStats.goals.map((file) => this.getGoalFileData(file))))
      .filter((goal): goal is GoalFileData => !!goal)
      .filter((goal) => goal.status !== 'completed' && goal.status !== 'merged');

    const visited = new Set<string>();
    const drafts: GoalMergeDraft[] = [];

    for (const goal of goals) {
      if (visited.has(goal.file.path)) continue;
      const group = [goal];
      visited.add(goal.file.path);

      for (const candidate of goals) {
        if (visited.has(candidate.file.path)) continue;
        if (this.getGoalSimilarityScore(goal, candidate) >= 0.34) {
          group.push(candidate);
          visited.add(candidate.file.path);
        }
      }

      if (group.length < 2) continue;
      drafts.push(this.buildGoalMergeDraft(group));
    }

    return drafts;
  }

  buildGoalMergeDraft(goals: GoalFileData[]): GoalMergeDraft {
    const sorted = [...goals].sort((a, b) => b.title.length - a.title.length);
    const primary = sorted[0];
    const descriptions = Array.from(new Set(goals.map((goal) => goal.description.trim()).filter(Boolean)));
    const milestones = Array.from(new Set(goals.flatMap((goal) => goal.milestones))).filter(Boolean);
    const targetDates = goals.map((goal) => goal.targetDate).filter((value): value is string => !!value).sort();
    const sourcePerspectives = Array.from(new Set(goals.flatMap((goal) => goal.sourcePerspectives)));
    const sourceAnalysisPath = goals.find((goal) => goal.sourceAnalysisPath)?.sourceAnalysisPath;

    return {
      sourceGoals: goals.sort((a, b) => a.title.localeCompare(b.title)),
      mergedTitle: primary.title,
      mergedDescription: descriptions.join('\n\n'),
      mergedCategory: primary.category,
      mergedTargetDate: targetDates[targetDates.length - 1],
      mergedMilestones: milestones,
      mergedSourceAnalysisPath: sourceAnalysisPath,
      mergedSourcePerspectives: sourcePerspectives
    };
  }

  buildMergedGoalNote(draft: GoalMergeDraft): string {
    const created = draft.sourceGoals
      .map((goal) => goal.created)
      .filter(Boolean)
      .sort()[0] || new Date().toISOString();
    const mergedFromLinks = draft.sourceGoals
      .map((goal) => `- [[${this.getWikiLinkTarget(goal.file.path)}|${goal.title}]]`)
      .join('\n');
    const sourceNoteLink = draft.mergedSourceAnalysisPath
      ? `[[${this.getWikiLinkTarget(draft.mergedSourceAnalysisPath)}|${this.getFileDisplayName(draft.mergedSourceAnalysisPath)}]]`
      : '';
    const sourcePerspectiveLinks = draft.mergedSourceAnalysisPath
      ? draft.mergedSourcePerspectives
          .map((perspectiveKey) => {
            const perspective = PERSPECTIVES[perspectiveKey];
            if (!perspective) return '';
            return `[[${this.getWikiLinkTarget(draft.mergedSourceAnalysisPath!)}#${perspective.title}|${perspective.title}]]`;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    return `---
type: goal
title: "${this.escapeYamlInlineString(draft.mergedTitle)}"
description: "${this.escapeYamlInlineString(draft.mergedDescription)}"
category: ${draft.mergedCategory}
target_date: ${draft.mergedTargetDate || 'null'}
progress_percentage: 0
status: active
created: ${created}
source_perspectives: ${this.formatYamlStringArray(draft.mergedSourcePerspectives)}
source_analysis_note: ${draft.mergedSourceAnalysisPath ? `"${this.escapeYamlString(draft.mergedSourceAnalysisPath)}"` : 'null'}
milestones: ${this.formatYamlStringArray(draft.mergedMilestones)}
merged_from: ${this.formatYamlStringArray(draft.sourceGoals.map((goal) => goal.file.path))}
---

# 🎯 ${draft.mergedTitle}

**Category:** ${GOAL_CATEGORIES[draft.mergedCategory]}
**Target Date:** ${draft.mergedTargetDate || 'Not set'}
**Status:** Active
${sourceNoteLink ? `**Source Note:** ${sourceNoteLink}\n` : ''}${sourcePerspectiveLinks ? `**Derived From Analysis Types:** ${sourcePerspectiveLinks}\n` : ''}

## Description
${draft.mergedDescription}

## Milestones
${draft.mergedMilestones.map((milestone) => `- [ ] ${milestone}`).join('\n') || '- [ ] Add first milestone'}

## Merged From Goals
${mergedFromLinks}

## Progress Notes

`;
  }

  buildMergedSourceNote(targetGoalPath: string, mergedTitle: string): string {
    return `---
type: goal
status: merged
merged_into: "${this.escapeYamlString(targetGoalPath)}"
---

# 🔀 Goal Merged

This goal has been consolidated into [[${this.getWikiLinkTarget(targetGoalPath)}|${mergedTitle}]].
`;
  }

  async deleteGoalCalendarEvents(goalFile: TFile) {
    const files = this.getGoalOwnedCalendarFiles(goalFile.path);
    for (const file of files) {
      await this.app.fileManager.trashFile(file);
    }
  }

  buildStandardGoalNote(goal: GoalFileData, extras?: { mergedFrom?: string[]; progressNotes?: string }) {
    const sourceAnalysisPath = goal.sourceAnalysisPath ? this.escapeYamlString(goal.sourceAnalysisPath) : '';
    const sourceNoteLink = goal.sourceAnalysisPath
      ? `[[${this.getWikiLinkTarget(goal.sourceAnalysisPath)}|${this.getFileDisplayName(goal.sourceAnalysisPath)}]]`
      : '';
    const sourcePerspectiveLinks = goal.sourceAnalysisPath
      ? goal.sourcePerspectives
          .map((perspectiveKey) => {
            const perspective = PERSPECTIVES[perspectiveKey];
            if (!perspective) return '';
            return `[[${this.getWikiLinkTarget(goal.sourceAnalysisPath!)}#${perspective.title}|${perspective.title}]]`;
          })
          .filter(Boolean)
          .join(', ')
      : '';
    const mergedFromLinks = extras?.mergedFrom?.length
      ? extras.mergedFrom.map((path) => `- [[${this.getWikiLinkTarget(path)}|${this.getFileDisplayName(path)}]]`).join('\n')
      : '';
    const milestoneFiles = this.getGoalOwnedMilestoneFiles(goal.file.path);
    const milestoneNoteLinks = milestoneFiles.length
      ? milestoneFiles.map((file) => `- [[${this.getWikiLinkTarget(file.path)}|${this.getFileDisplayName(file.path)}]]`).join('\n')
      : '';

    return `---
type: goal
title: "${this.escapeYamlInlineString(goal.title)}"
description: "${this.escapeYamlInlineString(goal.description)}"
category: ${goal.category}
target_date: ${goal.targetDate || 'null'}
progress_percentage: 0
status: ${goal.status || 'active'}
created: ${goal.created}
source_perspectives: ${this.formatYamlStringArray(goal.sourcePerspectives)}
source_analysis_note: ${sourceAnalysisPath ? `"${sourceAnalysisPath}"` : 'null'}
milestones: ${this.formatYamlStringArray(goal.milestones)}
${extras?.mergedFrom?.length ? `merged_from: ${this.formatYamlStringArray(extras.mergedFrom)}\n` : ''}
---

# 🎯 ${goal.title}

**Category:** ${GOAL_CATEGORIES[goal.category] || goal.category}
**Target Date:** ${goal.targetDate || 'Not set'}
**Status:** ${goal.status === 'completed' ? 'Completed' : 'Active'}
${sourceNoteLink ? `**Source Note:** ${sourceNoteLink}\n` : ''}${sourcePerspectiveLinks ? `**Derived From Analysis Types:** ${sourcePerspectiveLinks}\n` : ''}

## Description
${goal.description}

## Milestones
${goal.milestones.map((milestone) => `- [ ] ${milestone}`).join('\n') || '- [ ] Add first milestone'}
${milestoneNoteLinks ? `\n\n## Milestone Notes\n${milestoneNoteLinks}\n` : ''}
${mergedFromLinks ? `\n\n## Merged From Goals\n${mergedFromLinks}\n` : ''}

## Progress Notes
${extras?.progressNotes?.trim() ? `\n${extras.progressNotes.trim()}\n` : '\n'}
`;
  }

  buildMergedRedirectNote(targetGoalPath: string, mergedTitle: string, looseFrontmatter?: Record<string, unknown>) {
    const created = typeof looseFrontmatter?.created === 'string' ? `created: ${looseFrontmatter.created}\n` : '';
    const updated = typeof looseFrontmatter?.updated === 'string' ? `updated: ${looseFrontmatter.updated}\n` : '';
    return `---
type: goal
status: merged
merged_into: "${this.escapeYamlInlineString(targetGoalPath)}"
${created}${updated}
---

# 🔀 Goal Merged

This goal has been consolidated into [[${this.getWikiLinkTarget(targetGoalPath)}|${mergedTitle}]].
`;
  }

  async repairGoalFrontmatterFile(goalFile: TFile): Promise<boolean> {
    const content = await this.app.vault.cachedRead(goalFile);
    const looseFrontmatter = this.parseLooseFrontmatter(content);
    if (!looseFrontmatter) return false;

    if (looseFrontmatter.status === 'merged' && typeof looseFrontmatter.merged_into === 'string') {
      const mergedInto = looseFrontmatter.merged_into;
      const repaired = this.buildMergedRedirectNote(mergedInto, this.getFileDisplayName(mergedInto), looseFrontmatter);
      if (content !== repaired) {
        await this.app.vault.modify(goalFile, repaired);
        return true;
      }
      return false;
    }

    const goal = await this.getGoalFileData(goalFile);
    if (!goal) return false;

    const mergedFrom = Array.isArray(looseFrontmatter.merged_from)
      ? looseFrontmatter.merged_from.filter((item): item is string => typeof item === 'string')
      : [];
    const progressNotes = this.extractGoalSection(content, 'Progress Notes');
    const repaired = this.buildStandardGoalNote(goal, { mergedFrom, progressNotes });

    if (content !== repaired) {
      await this.app.vault.modify(goalFile, repaired);
      return true;
    }

    return false;
  }

  async repairAllGoalFrontmatter(showNotice: boolean = false) {
    const goalFiles = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(this.settings.goalsFolder));
    let repaired = 0;

    for (const file of goalFiles) {
      const changed = await this.repairGoalFrontmatterFile(file);
      if (changed) repaired += 1;
    }

    if (showNotice) {
      new Notice(repaired > 0 ? `🛠️ Repaired ${repaired} goal note${repaired === 1 ? '' : 's'}` : 'No goal notes needed repair');
    }
  }

  async consolidateGoalDrafts(drafts: GoalMergeDraft[]) {
    let mergedCount = 0;

    for (const draft of drafts) {
      if (draft.sourceGoals.length < 2) continue;

      const sortedGoals = [...draft.sourceGoals].sort((a, b) => a.file.path.localeCompare(b.file.path));
      const primary = sortedGoals[0];
      const primaryFile = primary.file;

      await this.app.vault.modify(primaryFile, this.buildMergedGoalNote(draft));
      await this.syncGoalMilestonesToFolder(primaryFile, true);
      await this.syncGoalFileToFullCalendar(primaryFile, true);

      for (const duplicate of sortedGoals.slice(1)) {
        await this.deleteGoalMilestoneNotes(duplicate.file);
        await this.deleteGoalCalendarEvents(duplicate.file);
        await this.app.vault.modify(duplicate.file, this.buildMergedSourceNote(primaryFile.path, draft.mergedTitle));
      }

      mergedCount += 1;
    }

    if (mergedCount > 0) {
      new Notice(`🎯 Consolidated ${mergedCount} similar goal group${mergedCount === 1 ? '' : 's'}`);
    }
  }

  async openGoalConsolidationModal() {
    await this.repairAllGoalFrontmatter(false);
    const drafts = await this.getConsolidationDrafts();
    if (drafts.length === 0) {
      new Notice('No similar goal groups found');
      return;
    }
    new GoalConsolidationModal(this.app, this, drafts).open();
  }

  getScheduledMilestoneDates(targetDate: string | undefined, createdAt: string, milestoneCount: number): string[] {
    if (milestoneCount <= 0) return [];

    const createdDate = Number.isNaN(new Date(createdAt).getTime()) ? new Date() : new Date(createdAt);
    const startDate = this.parseDateOnly(this.formatDateOnly(createdDate));

    if (targetDate && this.isValidDateString(targetDate)) {
      const endDate = this.parseDateOnly(targetDate);
      const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
      return Array.from({ length: milestoneCount }, (_, index) => {
        const offset = Math.max(0, Math.round((totalDays * (index + 1)) / (milestoneCount + 1)));
        const scheduled = this.addDays(startDate, offset);
        return this.formatDateOnly(scheduled > endDate ? endDate : scheduled);
      });
    }

    return Array.from({ length: milestoneCount }, (_, index) => this.formatDateOnly(this.addDays(startDate, (index + 1) * 7)));
  }

  getFullCalendarFolderFiles(): TFile[] {
    const folder = this.app.vault.getAbstractFileByPath(this.settings.fullCalendarFolder);
    if (!(folder instanceof TFolder)) return [];
    return folder.children.filter((child): child is TFile => child instanceof TFile);
  }

  getGoalOwnedCalendarFiles(goalFilePath: string): TFile[] {
    return this.getFullCalendarFolderFiles().filter((file) => {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      return frontmatter?.deleometer_owner === 'deleometer'
        && typeof frontmatter.deleometer_goal_path === 'string'
        && frontmatter.deleometer_goal_path === goalFilePath;
    });
  }

  buildFullCalendarEventPath(baseName: string): string {
    return this.getUniqueMarkdownPath(this.settings.fullCalendarFolder, this.sanitizeFileNamePart(baseName));
  }

  buildFullCalendarEventId(goalFilePath: string, kind: 'goal_due' | 'milestone', milestoneIndex?: number): string {
    const goalId = this.sanitizeFileNamePart(goalFilePath.replace(/\.md$/i, '').replace(/\//g, '-')).toLowerCase();
    const suffix = kind === 'milestone' ? `-${milestoneIndex || 0}` : '';
    return `deleometer-${goalId}-${kind}${suffix}`;
  }

  buildFullCalendarEventNote(event: {
    title: string;
    date: string;
    goalFile: TFile;
    goalTitle: string;
    kind: 'goal_due' | 'milestone';
    milestoneIndex?: number;
    milestoneText?: string;
    sourceAnalysisPath?: string;
    sourcePerspectives?: string[];
  }): string {
    const goalWikiTarget = this.getWikiLinkTarget(event.goalFile.path);
    const goalLink = `[[${goalWikiTarget}|${event.goalTitle}]]`;
    const eventId = this.buildFullCalendarEventId(event.goalFile.path, event.kind, event.milestoneIndex);
    const sourceAnalysisPath = event.sourceAnalysisPath;
    const sourceNoteLink = sourceAnalysisPath
      ? `[[${this.getWikiLinkTarget(sourceAnalysisPath)}|${this.getFileDisplayName(sourceAnalysisPath)}]]`
      : '';
    const sourceTypeLinks = sourceAnalysisPath && event.sourcePerspectives?.length
      ? event.sourcePerspectives
          .map((perspectiveKey) => {
            const perspective = PERSPECTIVES[perspectiveKey];
            if (!perspective) return '';
            return `[[${this.getWikiLinkTarget(sourceAnalysisPath)}#${perspective.title}|${perspective.title}]]`;
          })
          .filter(Boolean)
          .join(', ')
      : '';

    return `---
id: ${eventId}
title: "${this.escapeYamlString(event.title)}"
type: single
date: ${event.date}
allDay: true
deleometer_owner: deleometer
deleometer_event_kind: ${event.kind}
deleometer_goal_path: "${this.escapeYamlString(event.goalFile.path)}"
deleometer_goal_title: "${this.escapeYamlString(event.goalTitle)}"
deleometer_milestone_index: ${typeof event.milestoneIndex === 'number' ? event.milestoneIndex : 'null'}
deleometer_milestone_text: ${event.milestoneText ? `"${this.escapeYamlString(event.milestoneText)}"` : 'null'}
source_analysis_note: ${event.sourceAnalysisPath ? `"${this.escapeYamlString(event.sourceAnalysisPath)}"` : 'null'}
source_perspectives: ${this.formatYamlStringArray(event.sourcePerspectives || [])}
---

# ${event.title}

**Goal:** ${goalLink}
**Date:** ${event.date}
${sourceNoteLink ? `**Source Note:** ${sourceNoteLink}\n` : ''}${sourceTypeLinks ? `**Derived From:** ${sourceTypeLinks}\n` : ''}

${event.kind === 'goal_due'
  ? `This marks the target date for ${goalLink}.`
  : `Recommended milestone for ${goalLink}: ${event.milestoneText || ''}`}
`;
  }

  async upsertGoalCalendarEvent(existingFile: TFile | null, event: {
    title: string;
    date: string;
    goalFile: TFile;
    goalTitle: string;
    kind: 'goal_due' | 'milestone';
    milestoneIndex?: number;
    milestoneText?: string;
    sourceAnalysisPath?: string;
    sourcePerspectives?: string[];
  }) {
    const note = this.buildFullCalendarEventNote(event);
    if (existingFile) {
      await this.app.vault.modify(existingFile, note);
      return existingFile;
    }

    const baseName = `${event.date} ${event.kind === 'goal_due' ? 'Goal Due' : `Milestone ${event.milestoneIndex ?? ''}`} ${event.goalTitle}`.trim();
    const path = this.buildFullCalendarEventPath(baseName);
    return await this.app.vault.create(path, note);
  }

  async syncGoalFileToFullCalendar(goalFile: TFile, force: boolean = false): Promise<boolean> {
    if ((!this.settings.autoSyncGoalsToFullCalendar && !force) || !this.settings.fullCalendarFolder?.trim()) return false;

    const goal = await this.getGoalCalendarData(goalFile);
    if (!goal) return false;

    await this.ensureFolder(this.settings.fullCalendarFolder);

    const existingFiles = this.getGoalOwnedCalendarFiles(goalFile.path);
    const byKey = new Map<string, TFile>();
    for (const file of existingFiles) {
      const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
      const kind = typeof frontmatter?.deleometer_event_kind === 'string' ? frontmatter.deleometer_event_kind : '';
      const milestoneIndex = typeof frontmatter?.deleometer_milestone_index === 'number'
        ? frontmatter.deleometer_milestone_index
        : (typeof frontmatter?.deleometer_milestone_index === 'string' ? Number(frontmatter.deleometer_milestone_index) : NaN);
      const key = kind === 'milestone' && Number.isFinite(milestoneIndex) ? `milestone:${milestoneIndex}` : kind;
      if (key) byKey.set(key, file);
    }

    const expectedKeys = new Set<string>();

    if (goal.targetDate) {
      expectedKeys.add('goal_due');
      await this.upsertGoalCalendarEvent(byKey.get('goal_due') || null, {
        title: `Goal Due: ${goal.title}`,
        date: goal.targetDate,
        goalFile,
        goalTitle: goal.title,
        kind: 'goal_due',
        sourceAnalysisPath: goal.sourceAnalysisPath,
        sourcePerspectives: goal.sourcePerspectives
      });
    }

    const milestoneDates = this.getScheduledMilestoneDates(goal.targetDate, goal.created, goal.milestones.length);
    for (let index = 0; index < goal.milestones.length; index += 1) {
      const milestone = goal.milestones[index];
      const milestoneKey = `milestone:${index + 1}`;
      expectedKeys.add(milestoneKey);
      await this.upsertGoalCalendarEvent(byKey.get(milestoneKey) || null, {
        title: `Milestone: ${goal.title} (${index + 1}/${goal.milestones.length})`,
        date: milestoneDates[index],
        goalFile,
        goalTitle: goal.title,
        kind: 'milestone',
        milestoneIndex: index + 1,
        milestoneText: milestone,
        sourceAnalysisPath: goal.sourceAnalysisPath,
        sourcePerspectives: goal.sourcePerspectives
      });
    }

    for (const [key, file] of Array.from(byKey.entries())) {
      if (!expectedKeys.has(key)) {
        await this.app.fileManager.trashFile(file);
      }
    }

    return true;
  }

  async syncAllGoalsToFullCalendar(showNotice: boolean = false) {
    const goalStats = this.getGoalStats();
    let synced = 0;

    for (const goalFile of goalStats.goals) {
      const result = await this.syncGoalFileToFullCalendar(goalFile, true);
      if (result) synced += 1;
    }

    if (showNotice) {
      new Notice(`Synced ${synced} goal${synced === 1 ? '' : 's'} to calendar`);
    }
  }

  buildChatFileBaseName(sourceFilePath: string | undefined, perspectiveKey: string, dateStamp?: string, baseLabel?: string): string {
    const perspective = this.sanitizeFileNamePart(baseLabel || this.getPerspectiveHeadingTitle(perspectiveKey));
    const safeDate = this.sanitizeFileNamePart(dateStamp || new Date().toISOString().split('T')[0]);
    if (!sourceFilePath) {
      return `${safeDate}-${perspective}-Chat`;
    }

    return `${safeDate}-${this.sanitizeFileNamePart(this.getFileDisplayName(sourceFilePath))}-${perspective}-Chat`;
  }

  async ensurePerspectiveChatLinks(sourceFile: TFile, analysis: AnalysisPayload) {
    for (const perspectiveKey of Object.keys(analysis.perspectives)) {
      await this.upsertPerspectiveSectionLine(sourceFile.path, perspectiveKey, '**Continue Chat:**', this.buildPerspectiveChatLink(sourceFile.path, perspectiveKey));
    }
  }

  async ensureGroupSynthesisChatLinks(sourceFile: TFile, analysis: AnalysisPayload) {
    for (const groupKey of Object.keys(analysis.groupSyntheses)) {
      await this.upsertGroupSynthesisSectionLine(
        sourceFile.path,
        groupKey,
        '**Continue Group Chat:**',
        this.buildGroupSynthesisChatLink(sourceFile.path, groupKey)
      );
    }
  }

  buildGoalDraftLink(sourceFilePath: string): string {
    const encodedPath = encodeURIComponent(sourceFilePath);
    return `**Draft Goals:** [Open proposed goals](deleometer://goals?source=${encodedPath})`;
  }

  async updateGoalLinksInSourceAnalysis(goal: GoalFileData) {
    if (!goal.sourceAnalysisPath) return;
    const abstractFile = this.getVaultMarkdownFile(goal.sourceAnalysisPath);
    if (!abstractFile) return;

    const currentContent = await this.app.vault.read(abstractFile);
    const suggestionsStart = currentContent.search(/^##\s+.*Suggested Goals.*$/m);
    if (suggestionsStart === -1) return;

    const suggestionsSection = currentContent.slice(suggestionsStart);
    const nextSectionMatch = /^##\s+(?!.*Suggested Goals).*$/m.exec(suggestionsSection.slice(1));
    const boundedLength = nextSectionMatch ? nextSectionMatch.index + 1 : suggestionsSection.length;
    const boundedSection = suggestionsSection.slice(0, boundedLength);
    const headingRegex = /^###\s+(.+)$/gm;
    const headingMatches: { title: string; index: number; fullMatch: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(boundedSection)) !== null) {
      headingMatches.push({ title: match[1].trim(), index: match.index, fullMatch: match[0] });
    }

    const targetIndex = headingMatches.findIndex((heading) => (
      this.normalizeHeadingText(heading.title) === this.normalizeHeadingText(goal.title)
    ));
    if (targetIndex === -1) return;

    const heading = headingMatches[targetIndex];
    const bodyEnd = targetIndex + 1 < headingMatches.length ? headingMatches[targetIndex + 1].index : boundedSection.length;
    const goalSection = boundedSection.slice(heading.index, bodyEnd);
    const goalLinkLine = `**Saved Goal:** [[${this.getWikiLinkTarget(goal.file.path)}|${goal.title}]]`;
    const milestoneFiles = this.getGoalOwnedMilestoneFiles(goal.file.path);
    const milestoneLinks = milestoneFiles
      .map((file) => `[[${this.getWikiLinkTarget(file.path)}|${this.getFileDisplayName(file.path)}]]`)
      .join(', ');
    const milestoneLinkLine = milestoneLinks ? `**Milestone Notes:** ${milestoneLinks}` : '';
    const upsertLine = (section: string, prefix: string, fullLine: string) => {
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const lineRegex = new RegExp(`${escapedPrefix}.*(?:\\n|$)`);
      return lineRegex.test(section)
        ? section.replace(lineRegex, `${fullLine}\n`)
        : `${section.trimEnd()}\n${fullLine}\n`;
    };

    let updatedGoalSection = goalSection;
    updatedGoalSection = upsertLine(updatedGoalSection, '**Saved Goal:**', goalLinkLine);
    if (milestoneLinkLine) {
      updatedGoalSection = upsertLine(updatedGoalSection, '**Milestone Notes:**', milestoneLinkLine);
    }

    const updatedBoundedSection = `${boundedSection.slice(0, heading.index)}${updatedGoalSection}${boundedSection.slice(bodyEnd)}`;
    const updatedContent = `${currentContent.slice(0, suggestionsStart)}${updatedBoundedSection}${currentContent.slice(suggestionsStart + boundedLength)}`;
    await this.app.vault.modify(abstractFile, updatedContent);
  }

  async upsertPerspectiveSectionLine(sourceFilePath: string, perspectiveKey: string, linePrefix: string, fullLine: string) {
    if (!PERSPECTIVES[perspectiveKey]) return;
    const abstractFile = this.getVaultMarkdownFile(sourceFilePath);
    if (!abstractFile) return;

    const currentContent = await this.app.vault.read(abstractFile);
    const bounds = this.findPerspectiveSectionBounds(currentContent, perspectiveKey);
    if (!bounds) return;

    const section = currentContent.slice(bounds.start, bounds.end);

    const escapedPrefix = linePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lineRegex = new RegExp(`${escapedPrefix}.*(?:\\n|$)`);
    const updatedSection = lineRegex.test(section)
      ? section.replace(lineRegex, `${fullLine}\n`)
      : `${section.trimEnd()}\n${fullLine}\n`;

    await this.app.vault.modify(
      abstractFile,
      `${currentContent.slice(0, bounds.start)}${updatedSection}${currentContent.slice(bounds.end)}`
    );
  }

  async upsertGroupSynthesisSectionLine(sourceFilePath: string, groupKey: string, linePrefix: string, fullLine: string) {
    if (!PERSPECTIVE_GROUPS[groupKey]) return;
    const abstractFile = this.getVaultMarkdownFile(sourceFilePath);
    if (!abstractFile) return;

    const currentContent = await this.app.vault.read(abstractFile);
    const bounds = this.findGroupSynthesisSectionBounds(currentContent, groupKey);
    if (!bounds) return;

    const section = currentContent.slice(bounds.start, bounds.end);
    const escapedPrefix = linePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lineRegex = new RegExp(`${escapedPrefix}.*(?:\\n|$)`);
    const updatedSection = lineRegex.test(section)
      ? section.replace(lineRegex, `${fullLine}\n`)
      : `${section.trimEnd()}\n${fullLine}\n`;

    await this.app.vault.modify(
      abstractFile,
      `${currentContent.slice(0, bounds.start)}${updatedSection}${currentContent.slice(bounds.end)}`
    );
  }

  async saveChatBackToSourceNote(
    sourceFilePath: string,
    chatMessages: ConversationMessage[],
    chatStartTime: Date,
    options: { perspectiveKey?: string; groupKey?: string; speakerTitle?: string } = {}
  ): Promise<boolean> {
    const abstractFile = this.getVaultMarkdownFile(sourceFilePath);
    if (!abstractFile) return false;

    const currentContent = await this.app.vault.read(abstractFile);
    const bounds = options.groupKey
      ? this.findGroupSynthesisSectionBounds(currentContent, options.groupKey)
      : (options.perspectiveKey ? this.findPerspectiveSectionBounds(currentContent, options.perspectiveKey) : null);
    if (!bounds) return false;

    const speakerTitle = options.speakerTitle
      || (options.groupKey ? `${PERSPECTIVE_GROUPS[options.groupKey]?.title || options.groupKey} synthesis` : '')
      || (options.perspectiveKey ? this.getPerspectiveHeadingTitle(options.perspectiveKey) : 'AI');
    const messagesToPersist = chatMessages.filter((message, index) => {
      if (index === 0 && message.role === 'user' && message.content.startsWith('Here is a journal entry I wrote:')) {
        return false;
      }
      return true;
    });
    const transcript = messagesToPersist
      .map((message) => `${message.role === 'user' ? '**You:**' : `**${speakerTitle}:**`}\n\n${message.content}`)
      .join('\n\n---\n\n');
    const chatBlock = `#### Latest AI Chat (${chatStartTime.toLocaleString()})\n\n${transcript}\n`;
    const section = currentContent.slice(bounds.start, bounds.end);
    const updatedSection = /#### Latest AI Chat[\s\S]*$/m.test(section)
      ? section.replace(/#### Latest AI Chat[\s\S]*$/m, chatBlock)
      : `${section.trimEnd()}\n\n${chatBlock}\n`;

    await this.app.vault.modify(
      abstractFile,
      `${currentContent.slice(0, bounds.start)}${updatedSection}${currentContent.slice(bounds.end)}`
    );
    return true;
  }

  async appendAnalysisToFile(sourceFile: TFile, analysis: AnalysisPayload) {
    const currentContent = await this.app.vault.read(sourceFile);
    const analysisStart = this.findAnalysisSectionStart(currentContent);

    if (analysisStart !== -1) {
      const cleaned = currentContent.slice(0, analysisStart).trimEnd();
      await this.app.vault.modify(sourceFile, `${cleaned.trimEnd()}${this.buildAnalysisMarkdown(analysis, sourceFile.path)}`);
    } else {
      await this.app.vault.modify(sourceFile, `${currentContent.trimEnd()}${this.buildAnalysisMarkdown(analysis, sourceFile.path)}`);
    }
    await this.ensurePerspectiveChatLinks(sourceFile, analysis);
    await this.ensureGroupSynthesisChatLinks(sourceFile, analysis);
  }

  async writeAnalysisStatusToFile(sourceFile: TFile, status: string) {
    const currentContent = await this.app.vault.read(sourceFile);
    const analysisStart = this.findAnalysisSectionStart(currentContent);
    const statusMarkdown = `\n\n---\n\n## 🔍 AI Analysis\n\n*Status: ${status}*\n\n`;

    if (analysisStart !== -1) {
      const cleaned = currentContent.slice(0, analysisStart).trimEnd();
      await this.app.vault.modify(sourceFile, `${cleaned.trimEnd()}${statusMarkdown}`);
    } else {
      await this.app.vault.modify(sourceFile, `${currentContent.trimEnd()}${statusMarkdown}`);
    }
  }

  buildAnalysisMarkdown(analysis: AnalysisPayload, sourceFilePath: string = ''): string {
    let analysisMarkdown = '\n\n---\n## 🔍 AI Analysis\n';
    analysisMarkdown += `*Analyzed: ${new Date().toLocaleString()}*\n`;

    for (const [perspKey, content] of Object.entries(analysis.perspectives)) {
      const persp = PERSPECTIVES[perspKey];
      const groupTitle = persp ? PERSPECTIVE_GROUPS[persp.group]?.title : '';
      analysisMarkdown += `\n### ${persp?.title || perspKey}\n`;
      if (groupTitle) {
        analysisMarkdown += `*Group: ${groupTitle}*\n`;
      }
      analysisMarkdown += `${content}\n`;
      const readings = analysis.furtherReadings[perspKey] || [];
      if (readings.length > 0) {
        analysisMarkdown += `#### Further readings\n${readings.map((reading) => `- ${reading}`).join('\n')}\n`;
      }
    }

    if (Object.keys(analysis.groupSyntheses).length > 0) {
      analysisMarkdown += `\n## Group Syntheses\n`;
      for (const [groupKey, content] of Object.entries(analysis.groupSyntheses)) {
        const group = PERSPECTIVE_GROUPS[groupKey];
        analysisMarkdown += `### ${group?.title || groupKey}\n${content}\n`;
      }
    }

    if (analysis.philosophicalReaccumulation) {
      analysisMarkdown += `\n## Philosophy Re-accumulation\n${analysis.philosophicalReaccumulation}\n`;
    }

    if (analysis.analysisWarnings.length > 0) {
      analysisMarkdown += `\n## Analysis Notes\n`;
      analysisMarkdown += `${analysis.analysisWarnings.map((warning) => `- ${warning}`).join('\n')}\n`;
    }

    if (analysis.goalSuggestions.length > 0) {
      analysisMarkdown += `\n## 🎯 Suggested Goals\n`;
      for (const goal of analysis.goalSuggestions) {
        analysisMarkdown += `### ${goal.title}\n${goal.description}\n`;
        if (goal.milestones.length > 0) {
          analysisMarkdown += `${goal.milestones.map((milestone) => `- ${milestone}`).join('\n')}\n`;
        }
      }
      if (sourceFilePath) {
        analysisMarkdown += `${this.buildGoalDraftLink(sourceFilePath)}\n`;
      }
    }

    return analysisMarkdown;
  }

  async openJournalAnalysisChat(journalContent: string, analysis: Record<string, string>, preferredPerspective?: string) {
    const perspective = preferredPerspective && analysis[preferredPerspective]
      ? preferredPerspective
      : this.getPreferredPerspective(analysis);

    if (!perspective) throw new Error('No analysis available to open in chat');

    this.pendingChatContext = {
      perspective,
      journalContent,
      initialAnalysis: analysis[perspective]
    };

    await this.activateAIChatView();
  }

  getJournalStats(): { entries: number; avgMood: number; recentEntries: TFile[] } {
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(this.settings.journalFolder));
    let totalMood = 0, moodCount = 0;
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.mood_score) { totalMood += cache.frontmatter.mood_score; moodCount++; }
    }
    const sorted = files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    return { entries: files.length, avgMood: moodCount > 0 ? totalMood / moodCount : 0, recentEntries: sorted.slice(0, 5) };
  }

  getGoalStats(): { total: number; completed: number; active: number; goals: TFile[] } {
    const files = this.app.vault.getMarkdownFiles().filter((file) => {
      if (!this.isGoalFile(file)) return false;
      const status: unknown = this.app.metadataCache.getFileCache(file)?.frontmatter?.status;
      return status !== 'merged';
    });
    let completed = 0;
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache?.frontmatter?.status === 'completed') completed++;
    }
    const active = Math.max(files.length - completed, 0);
    const sorted = files.sort((a, b) => b.stat.mtime - a.stat.mtime);
    return { total: sorted.length, completed, active, goals: sorted };
  }

  isGoalFile(file: TFile): boolean {
    if (file.path.startsWith(this.settings.goalsFolder)) return true;

    const rawFrontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!rawFrontmatter || typeof rawFrontmatter !== 'object') return false;
    const frontmatter = rawFrontmatter as Record<string, unknown>;

    const type: unknown = frontmatter.type;
    const progressPercentage: unknown = frontmatter.progress_percentage;
    const category: unknown = frontmatter.category;
    const milestones: unknown = frontmatter.milestones;

    const isGoalType = type === 'goal';
    const hasProgress = typeof progressPercentage !== 'undefined';
    const hasKnownCategory = typeof category === 'string'
      ? Object.keys(GOAL_CATEGORIES).includes(category)
      : false;
    const hasMilestones = Array.isArray(milestones);

    return isGoalType || hasProgress || hasKnownCategory || hasMilestones;
  }

  async loadSettings() {
    const savedData = await this.loadData() as Partial<DeleometerSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData ?? {});
    if (!ZPD_LEVELS[this.settings.zpdLevel]) {
      this.settings.zpdLevel = DEFAULT_SETTINGS.zpdLevel;
    }
    if (!OUTPUT_LANGUAGES[this.settings.outputLanguage]) {
      this.settings.outputLanguage = DEFAULT_SETTINGS.outputLanguage;
    }
    this.settings.redactSensitiveDataBeforeAI = typeof this.settings.redactSensitiveDataBeforeAI === 'boolean'
      ? this.settings.redactSensitiveDataBeforeAI
      : DEFAULT_SETTINGS.redactSensitiveDataBeforeAI;
    this.settings.enableAuthorMemory = typeof this.settings.enableAuthorMemory === 'boolean'
      ? this.settings.enableAuthorMemory
      : DEFAULT_SETTINGS.enableAuthorMemory;
    this.settings.includeAuthorMemoryInAI = typeof this.settings.includeAuthorMemoryInAI === 'boolean'
      ? this.settings.includeAuthorMemoryInAI
      : DEFAULT_SETTINGS.includeAuthorMemoryInAI;
    this.settings.includePersonalityProfileInAI = typeof this.settings.includePersonalityProfileInAI === 'boolean'
      ? this.settings.includePersonalityProfileInAI
      : DEFAULT_SETTINGS.includePersonalityProfileInAI;
    this.settings.sendFullJournalToChat = typeof this.settings.sendFullJournalToChat === 'boolean'
      ? this.settings.sendFullJournalToChat
      : DEFAULT_SETTINGS.sendFullJournalToChat;
    this.settings.milestonesFolder = typeof this.settings.milestonesFolder === 'string' && this.settings.milestonesFolder.trim()
      ? this.settings.milestonesFolder
      : DEFAULT_SETTINGS.milestonesFolder;
    const perspectiveKeys = getChronologicalPerspectiveKeys();
    if (!Array.isArray(this.settings.selectedPerspectives) || this.settings.selectedPerspectives.length === 0) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const selectedPerspectives = this.settings.selectedPerspectives.filter((key) => !!PERSPECTIVES[key]);
    const hadEveryPreHierarchyPerspective = PRE_HIERARCHY_PERSPECTIVE_KEYS
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreHierarchyPerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const preOrganisationalTransformationPerspectiveKeys = perspectiveKeys
      .filter((key) => !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPreOrganisationalTransformationPerspective = preOrganisationalTransformationPerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreOrganisationalTransformationPerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const preDevelopmentalGuidancePerspectiveKeys = perspectiveKeys
      .filter((key) => !DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS.includes(key) && !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPreDevelopmentalGuidancePerspective = preDevelopmentalGuidancePerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreDevelopmentalGuidancePerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const preMaterialDiscursivePerspectiveKeys = perspectiveKeys
      .filter((key) => !MATERIAL_DISCURSIVE_PERSPECTIVE_KEYS.includes(key) && !DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS.includes(key) && !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPreMaterialDiscursivePerspective = preMaterialDiscursivePerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreMaterialDiscursivePerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const preSelfSubjectivityPerspectiveKeys = perspectiveKeys
      .filter((key) => !SELF_SUBJECTIVITY_PERSPECTIVE_KEYS.includes(key) && !MATERIAL_DISCURSIVE_PERSPECTIVE_KEYS.includes(key) && !DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS.includes(key) && !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPreSelfSubjectivityPerspective = preSelfSubjectivityPerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreSelfSubjectivityPerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const preAccumulatedChronologyPerspectiveKeys = perspectiveKeys
      .filter((key) => !ACCUMULATED_CHRONOLOGY_PERSPECTIVE_KEYS.includes(key) && !SELF_SUBJECTIVITY_PERSPECTIVE_KEYS.includes(key) && !MATERIAL_DISCURSIVE_PERSPECTIVE_KEYS.includes(key) && !DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS.includes(key) && !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPreAccumulatedChronologyPerspective = preAccumulatedChronologyPerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreAccumulatedChronologyPerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const preSemioticLinguisticPerspectiveKeys = perspectiveKeys
      .filter((key) => !SEMIOTIC_LINGUISTIC_PERSPECTIVE_KEYS.includes(key) && !ACCUMULATED_CHRONOLOGY_PERSPECTIVE_KEYS.includes(key) && !SELF_SUBJECTIVITY_PERSPECTIVE_KEYS.includes(key) && !MATERIAL_DISCURSIVE_PERSPECTIVE_KEYS.includes(key) && !DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS.includes(key) && !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key) && !PHILOSOPHY_LINEAGE_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPreSemioticLinguisticPerspective = preSemioticLinguisticPerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPreSemioticLinguisticPerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const prePhilosophyLineagePerspectiveKeys = perspectiveKeys
      .filter((key) => !PHILOSOPHY_LINEAGE_PERSPECTIVE_KEYS.includes(key) && !SEMIOTIC_LINGUISTIC_PERSPECTIVE_KEYS.includes(key) && !ACCUMULATED_CHRONOLOGY_PERSPECTIVE_KEYS.includes(key) && !SELF_SUBJECTIVITY_PERSPECTIVE_KEYS.includes(key) && !MATERIAL_DISCURSIVE_PERSPECTIVE_KEYS.includes(key) && !DEVELOPMENTAL_GUIDANCE_PERSPECTIVE_KEYS.includes(key) && !ORGANISATIONAL_TRANSFORMATION_PERSPECTIVE_KEYS.includes(key));
    const hadEveryPrePhilosophyLineagePerspective = prePhilosophyLineagePerspectiveKeys
      .every((key) => selectedPerspectives.includes(key));
    if (hadEveryPrePhilosophyLineagePerspective) {
      this.settings.selectedPerspectives = perspectiveKeys;
      return;
    }
    const existingPerspectiveKeys = perspectiveKeys.filter((key) => key !== MYERS_BRIGGS_PERSPECTIVE_KEY);
    const hadEveryExistingPerspective = existingPerspectiveKeys.every((key) => selectedPerspectives.includes(key));
    if (hadEveryExistingPerspective && !selectedPerspectives.includes(MYERS_BRIGGS_PERSPECTIVE_KEY)) {
      selectedPerspectives.push(MYERS_BRIGGS_PERSPECTIVE_KEY);
    }
    this.settings.selectedPerspectives = selectedPerspectives.length > 0 ? selectedPerspectives : perspectiveKeys;
  }
  async saveSettings() { await this.saveData(this.settings); }
  onunload() {}
}



// Dashboard View
class DashboardView extends ItemView {
  plugin: DeleometerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: DeleometerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_DASHBOARD; }
  getDisplayText() { return 'Deleometer dashboard'; }
  getIcon() { return 'bar-chart-3'; }

  onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('deleometer-dashboard');

    const header = container.createDiv({ cls: 'deleometer-header' });
    header.createEl('h2', { text: 'Deleometer dashboard' });
    header.createEl('p', { text: 'Your emotional intelligence dashboard', cls: 'deleometer-subtitle' });

    const stats = container.createDiv({ cls: 'deleometer-stats' });
    const journalStats = this.plugin.getJournalStats();
    const goalStats = this.plugin.getGoalStats();

    this.createStatCard(stats, '📝', journalStats.entries.toString(), 'Journal entries', () => {
      new FileListModal(this.app, 'Journal entries', journalStats.recentEntries.length > 0
        ? this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(this.plugin.settings.journalFolder)).sort((a, b) => b.stat.mtime - a.stat.mtime)
        : []).open();
    });
    this.createStatCard(stats, '😊', journalStats.avgMood.toFixed(1), 'Average mood');
    this.createStatCard(stats, '🎯', goalStats.total.toString(), 'Total goals', () => {
      new FileListModal(this.app, 'All goals', goalStats.goals).open();
    });
    this.createStatCard(stats, '📌', goalStats.active.toString(), 'Active goals', () => {
      new FileListModal(
        this.app,
        'Active goals',
        goalStats.goals.filter((file) => this.app.metadataCache.getFileCache(file)?.frontmatter?.status !== 'completed')
      ).open();
    });
    this.createStatCard(stats, '✅', goalStats.completed.toString(), 'Completed goals', () => {
      new FileListModal(
        this.app,
        'Completed goals',
        goalStats.goals.filter((file) => this.app.metadataCache.getFileCache(file)?.frontmatter?.status === 'completed')
      ).open();
    });

    // Personality Profile Section
    if (this.plugin.settings.personalityProfile) {
      const profile = this.plugin.settings.personalityProfile;
      const profileSection = container.createDiv({ cls: 'analysis-section' });
      profileSection.createEl('h3', { text: 'Your personality profile' });
      const chart = profileSection.createDiv({ cls: 'big-five-chart' });
      const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
      for (const trait of traits) {
        const score = profile.big_five_scores[trait];
        const bar = chart.createDiv({ cls: 'trait-bar' });
        bar.createDiv({ cls: 'trait-label', text: trait.charAt(0).toUpperCase() + trait.slice(1) });
        const progress = bar.createDiv({ cls: 'trait-progress' });
        const fill = progress.createDiv({ cls: `trait-fill ${trait}` });
        fill.style.width = `${score}%`;
        bar.createDiv({ cls: 'trait-score', text: `${score}` });
      }
    }

    // Mood Trend Chart (Obsidian Charts compatible)
    if (journalStats.entries > 0) {
      const moodChartSection = container.createDiv({ cls: 'analysis-section' });
      moodChartSection.createEl('h3', { text: 'Mood trends' });
      const moodData = this.getMoodTrendData();
      if (moodData.labels.length > 0) {
        this.renderMoodChart(moodChartSection, moodData);
      } else {
        moodChartSection.createEl('p', { text: 'Add mood scores to your journal entries to see trends.', cls: 'empty-state' });
      }
    }

    // Goal Progress Chart
    if (goalStats.total > 0) {
      const goalChartSection = container.createDiv({ cls: 'analysis-section' });
      goalChartSection.createEl('h3', { text: 'Goal progress' });
      this.renderGoalChart(goalChartSection, goalStats);

      const consolidateRow = goalChartSection.createDiv({ cls: 'btn-row' });
      const consolidateBtn = consolidateRow.createEl('button', { text: 'Consolidate similar goals', cls: 'btn-secondary btn-small' });
      consolidateBtn.onclick = () => { void this.plugin.openGoalConsolidationModal(); };
      const syncMilestonesBtn = consolidateRow.createEl('button', { text: 'Sync milestones to folder', cls: 'btn-secondary btn-small' });
      syncMilestonesBtn.onclick = () => { void this.plugin.syncAllGoalMilestonesToFolder(true); };
      const consolidateMilestonesBtn = consolidateRow.createEl('button', { text: 'Consolidate similar milestones', cls: 'btn-secondary btn-small' });
      consolidateMilestonesBtn.onclick = () => { void this.plugin.openMilestoneConsolidationModal(); };

      const goalsSection = container.createDiv({ cls: 'deleometer-recent' });
      goalsSection.createEl('h3', { text: 'Goals' });
      const goalList = goalsSection.createEl('ul', { cls: 'recent-list' });
      for (const file of goalStats.goals.slice(0, 8)) {
        const li = goalList.createEl('li');
        const link = li.createEl('a', { text: file.basename, href: '#' });
        link.onclick = (e) => { e.preventDefault(); void this.app.workspace.getLeaf().openFile(file); };
      }

      if (goalStats.goals.length > 8) {
        const viewAll = goalsSection.createEl('button', { text: 'View all goals', cls: 'btn-secondary btn-small' });
        viewAll.onclick = () => new FileListModal(this.app, 'All goals', goalStats.goals).open();
      }
    }

    // Recent Entries
    const recent = container.createDiv({ cls: 'deleometer-recent' });
    recent.createEl('h3', { text: 'Recent journal entries' });
    if (journalStats.recentEntries.length === 0) {
      recent.createEl('p', { text: 'No journal entries yet. Click the 📝 icon to create one!', cls: 'empty-state' });
    } else {
      const list = recent.createEl('ul', { cls: 'recent-list' });
      for (const file of journalStats.recentEntries) {
        const li = list.createEl('li');
        const link = li.createEl('a', { text: file.basename, href: '#' });
        link.onclick = (e) => { e.preventDefault(); void this.app.workspace.getLeaf().openFile(file); };
      }
    }

    // Export Charts Button
    const exportSection = container.createDiv({ cls: 'btn-row' });
    const exportBtn = exportSection.createEl('button', { text: 'Export charts to note', cls: 'btn-primary' });
    exportBtn.onclick = () => { void this.exportChartsToNote(); };
    return Promise.resolve();
  }

  getMoodTrendData(): { labels: string[]; data: number[] } {
    const files = this.app.vault.getMarkdownFiles().filter(f => f.path.startsWith(this.plugin.settings.journalFolder));
    const moodEntries: { date: string; mood: number }[] = [];
    for (const file of files) {
      const cache = this.app.metadataCache.getFileCache(file);
      const moodScore: unknown = cache?.frontmatter?.mood_score;
      const entryDate: unknown = cache?.frontmatter?.date;
      if (typeof moodScore === 'number' && typeof entryDate === 'string') {
        moodEntries.push({ date: entryDate.split('T')[0], mood: moodScore });
      }
    }
    moodEntries.sort((a, b) => a.date.localeCompare(b.date));
    const last7 = moodEntries.slice(-7);
    return { labels: last7.map(e => e.date.slice(5)), data: last7.map(e => e.mood) };
  }

  renderMoodChart(container: HTMLElement, data: { labels: string[]; data: number[] }) {
    const chartDiv = container.createDiv({ cls: 'chart-container' });
    // Simple bar chart visualization
    const maxMood = 10;
    const chartBars = chartDiv.createDiv({ cls: 'simple-chart' });
    data.labels.forEach((label, i) => {
      const barWrapper = chartBars.createDiv({ cls: 'chart-bar-wrapper' });
      const bar = barWrapper.createDiv({ cls: 'chart-bar' });
      bar.style.height = `${(data.data[i] / maxMood) * 100}%`;
      bar.style.backgroundColor = this.getMoodColor(data.data[i]);
      barWrapper.createDiv({ cls: 'chart-label', text: label });
    });
  }

  getMoodColor(mood: number): string {
    if (mood >= 8) return '#10b981';
    if (mood >= 6) return '#3b82f6';
    if (mood >= 4) return '#f59e0b';
    return '#ef4444';
  }

  renderGoalChart(container: HTMLElement, stats: { total: number; completed: number; active: number }) {
    const chartDiv = container.createDiv({ cls: 'goal-chart' });
    const total = stats.total || 1;
    const completedPct = (stats.completed / total) * 100;
    const activePct = (stats.active / total) * 100;
    const otherPct = 100 - completedPct - activePct;

    const progressBar = chartDiv.createDiv({ cls: 'goal-progress-bar' });
    if (completedPct > 0) {
      const completedSegment = progressBar.createDiv({ cls: 'goal-segment completed' });
      completedSegment.style.width = `${completedPct}%`;
    }
    if (activePct > 0) {
      const activeSegment = progressBar.createDiv({ cls: 'goal-segment active' });
      activeSegment.style.width = `${activePct}%`;
    }
    if (otherPct > 0) {
      const otherSegment = progressBar.createDiv({ cls: 'goal-segment other' });
      otherSegment.style.width = `${otherPct}%`;
    }

    const legend = chartDiv.createDiv({ cls: 'goal-legend' });
    legend.createEl('span', { text: `✅ Completed: ${stats.completed}`, cls: 'legend-item' });
    legend.createEl('span', { text: `🎯 Active: ${stats.active}`, cls: 'legend-item' });
    legend.createEl('span', { text: `📋 Other: ${stats.total - stats.completed - stats.active}`, cls: 'legend-item' });
  }

  async exportChartsToNote() {
    const journalStats = this.plugin.getJournalStats();
    const goalStats = this.plugin.getGoalStats();
    const moodData = this.getMoodTrendData();
    const profile = this.plugin.settings.personalityProfile;

    let content = `# 📊 Deleometer Analytics Report\n\n`;
    content += `*Generated: ${new Date().toLocaleString()}*\n\n`;
    content += `## 📈 Summary Stats\n\n`;
    content += `| Metric | Value |\n|--------|-------|\n`;
    content += `| Journal Entries | ${journalStats.entries} |\n`;
    content += `| Average Mood | ${journalStats.avgMood.toFixed(1)} |\n`;
    content += `| Active Goals | ${goalStats.active} |\n`;
    content += `| Completed Goals | ${goalStats.completed} |\n\n`;

    // Obsidian Charts - Mood Trend
    if (moodData.labels.length > 0) {
      content += `## 📈 Mood trend (last 7 entries)\n\n`;
      content += "```chart\ntype: line\nlabels: [" + moodData.labels.map(l => `"${l}"`).join(', ') + "]\nseries:\n  - title: Mood\n    data: [" + moodData.data.join(', ') + "]\ntension: 0.2\nwidth: 80%\nlabelColors: true\nfill: true\nbeginAtZero: true\n```\n\n";
    }

    // Obsidian Charts - Goal Progress
    if (goalStats.total > 0) {
      content += `## 🎯 Goal progress\n\n`;
      content += "```chart\ntype: doughnut\nlabels: [\"Completed\", \"Active\", \"Other\"]\nseries:\n  - title: Goals\n    data: [" + goalStats.completed + ", " + goalStats.active + ", " + (goalStats.total - goalStats.completed - goalStats.active) + "]\nwidth: 50%\nlabelColors: true\n```\n\n";
    }

    // Obsidian Charts - Big Five Profile
    if (profile) {
      content += `## 🧬 Personality profile\n\n`;
      content += "```chart\ntype: radar\nlabels: [\"Openness\", \"Conscientiousness\", \"Extraversion\", \"Agreeableness\", \"Neuroticism\"]\nseries:\n  - title: Your Profile\n    data: [" + profile.big_five_scores.openness + ", " + profile.big_five_scores.conscientiousness + ", " + profile.big_five_scores.extraversion + ", " + profile.big_five_scores.agreeableness + ", " + profile.big_five_scores.neuroticism + "]\nwidth: 60%\nlabelColors: true\n```\n\n";
      content += `**Psychological type:** ${profile.psychological_type}\n\n`;
      content += `**Dominant traits:** ${profile.dominant_traits.join(', ')}\n\n`;
      content += `**Growth areas:** ${profile.growth_areas.join(', ')}\n\n`;
    }

    await this.plugin.ensureFolder('Deleometer');
    const fileName = `Deleometer/Analytics-${new Date().toISOString().split('T')[0]}.md`;
    try {
      const file = await this.app.vault.create(fileName, content);
      await this.app.workspace.getLeaf().openFile(file);
      new Notice('Analytics report exported!');
    } catch {
      new Notice('Report already exists for today');
    }
  }

  createStatCard(parent: HTMLElement, icon: string, value: string, label: string, onClick?: () => void) {
    const card = parent.createDiv({ cls: 'stat-card' });
    card.createDiv({ cls: 'stat-icon', text: icon });
    card.createDiv({ cls: 'stat-number', text: value });
    card.createDiv({ cls: 'stat-label', text: label });
    if (onClick) {
      card.addClass('clickable-card');
      card.onclick = () => onClick();
    }
  }

  async onClose() {}
}

class FileListModal extends Modal {
  title: string;
  files: TFile[];

  constructor(app: App, title: string, files: TFile[]) {
    super(app);
    this.title = title;
    this.files = files;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('deleometer-modal');
    contentEl.createEl('h2', { text: this.title });

    if (this.files.length === 0) {
      contentEl.createEl('p', { text: 'Nothing to show yet.', cls: 'empty-state' });
      return;
    }

    const list = contentEl.createEl('ul', { cls: 'recent-list' });
    for (const file of this.files) {
      const li = list.createEl('li');
      const link = li.createEl('a', { text: file.basename, href: '#' });
      link.onclick = async (event) => {
        event.preventDefault();
        await this.app.workspace.getLeaf().openFile(file);
        this.close();
      };
    }
  }

  onClose() { this.contentEl.empty(); }
}

// AI Chat View
class AIChatView extends ItemView {
  plugin: DeleometerPlugin;
  chatMessages: ConversationMessage[] = [];
  currentPerspective: string = 'lacanian_perspective';
  sourceChatKind: 'perspective' | 'group_synthesis' = 'perspective';
  sourcePerspectiveKey: string = '';
  sourceGroupKey: string = '';
  sourceTitle: string = '';
  sourceDescription: string = '';
  liveContextTitle: string = '';
  liveContextDescription: string = '';
  messagesContainer: HTMLElement;
  inputArea: HTMLTextAreaElement;
  chatTitle: string = '';
  chatStartTime: Date = new Date();
  journalContext: string = '';
  sourceFilePath: string = '';
  initialAnalysis: string = '';

  constructor(leaf: WorkspaceLeaf, plugin: DeleometerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() { return VIEW_TYPE_AI_CHAT; }
  getDisplayText() { return 'AI emotional chat'; }
  getIcon() { return 'message-circle'; }

  onOpen(): Promise<void> {
    const container = this.containerEl.children[1] instanceof HTMLElement
      ? this.containerEl.children[1]
      : this.containerEl;
    container.empty();
    container.addClass('deleometer-chat');

    // Reset for new chat
    this.chatMessages = [];
    this.chatStartTime = new Date();
    this.journalContext = '';
    this.sourceFilePath = '';
    this.initialAnalysis = '';
    this.sourceChatKind = 'perspective';
    this.sourcePerspectiveKey = '';
    this.sourceGroupKey = '';
    this.sourceTitle = '';
    this.sourceDescription = '';
    this.liveContextTitle = '';
    this.liveContextDescription = '';

    // Check for pending context from journal analysis
    const context = this.plugin.pendingChatContext;
    if (context) {
      this.sourceChatKind = context.chatKind || 'perspective';
      this.currentPerspective = context.perspective;
      this.sourcePerspectiveKey = this.sourceChatKind === 'perspective' ? context.perspective : '';
      this.sourceGroupKey = context.sourceGroupKey || '';
      this.journalContext = context.journalContent;
      this.sourceTitle = context.sourceTitle || PERSPECTIVES[context.perspective]?.title || context.perspective;
      this.sourceDescription = context.sourceDescription || PERSPECTIVES[context.perspective]?.description || '';
      this.liveContextTitle = this.sourceTitle;
      this.liveContextDescription = this.sourceDescription;
      this.chatTitle = `Journal analysis - ${this.sourceTitle}`;
      this.sourceFilePath = context.sourceFilePath || '';
      this.initialAnalysis = context.initialAnalysis || '';
      this.plugin.pendingChatContext = null; // Clear it
    } else {
      this.chatTitle = `Chat - ${new Date().toLocaleDateString()}`;
    }

    const header = container.createDiv({ cls: 'chat-header' });
    const headerTop = header.createDiv({ cls: 'chat-header-top' });
    headerTop.createEl('h2', { text: 'AI emotional chat' });

    // Action buttons
    const actionBtns = headerTop.createDiv({ cls: 'chat-actions' });
    const saveBtn = actionBtns.createEl('button', { text: 'Save chat', cls: 'btn-secondary btn-small' });
    saveBtn.onclick = () => { void this.saveChat(); };
    const exportBtn = actionBtns.createEl('button', { text: 'Export chat', cls: 'btn-secondary btn-small' });
    exportBtn.onclick = () => { void this.exportToNote(); };
    const newChatBtn = actionBtns.createEl('button', { text: 'New chat', cls: 'btn-secondary btn-small' });
    newChatBtn.onclick = () => this.startNewChat();

    if (context) {
      header.createEl('p', { text: `Continuing analysis with ${this.sourceTitle}`, cls: 'chat-subtitle context-active' });
    } else {
      header.createEl('p', { text: 'Explore your emotions with AI guidance', cls: 'chat-subtitle' });
    }

    // Perspective selector
    const selector = container.createDiv({ cls: 'perspective-selector-container' });
    selector.createEl('label', { text: 'Perspective: ' });
    const select = selector.createEl('select', { cls: 'perspective-selector' });
    for (const [key, persp] of Object.entries(PERSPECTIVES)) {
      const option = select.createEl('option', { text: persp.title, value: key });
      if (key === this.currentPerspective) option.selected = true;
    }
    select.onchange = () => {
      this.currentPerspective = select.value;
      this.liveContextTitle = '';
      this.liveContextDescription = '';
      // Add a system message about perspective change
      this.addMessage('assistant', `I'll now respond from a ${PERSPECTIVES[this.currentPerspective].title} perspective. How can I help you?`);
    };

    const levelSelector = container.createDiv({ cls: 'perspective-selector-container' });
    levelSelector.createEl('label', { text: 'Reader level: ' });
    const levelSelect = levelSelector.createEl('select', { cls: 'perspective-selector' });
    for (const [key, level] of Object.entries(ZPD_LEVELS)) {
      const option = levelSelect.createEl('option', { text: level.label, value: key });
      if (key === this.plugin.settings.zpdLevel) option.selected = true;
    }
    levelSelect.onchange = () => {
      this.plugin.settings.zpdLevel = ZPD_LEVELS[levelSelect.value] ? levelSelect.value : 'tertiary_year_2';
      void this.plugin.saveSettings();
      this.addMessage('assistant', `I'll respond at the ${ZPD_LEVELS[this.plugin.settings.zpdLevel].label} level from here.`);
    };

    this.messagesContainer = container.createDiv({ cls: 'chat-messages' });

    // If we have context from journal analysis, set up the conversation
    if (context) {
      // Show the journal excerpt
      this.addMessage('user', `[From my journal entry]\n\n${context.journalContent.substring(0, 500)}${context.journalContent.length > 500 ? '...' : ''}`);
      const journalContextForAI = this.plugin.getChatJournalContextForAI(context.journalContent);
      this.chatMessages.push({ role: 'user', content: `Here is a journal entry I wrote:\n\n${journalContextForAI}` });

      // Show the initial analysis
      this.addMessage('assistant', context.initialAnalysis);
      this.chatMessages.push({ role: 'assistant', content: context.initialAnalysis });

      // Add follow-up prompt
      this.addMessage('assistant', `I'd love to explore this further with you. What aspects of this analysis resonate with you? Or is there something specific you'd like to discuss more deeply?`);
      this.chatMessages.push({ role: 'assistant', content: `I'd love to explore this further with you. What aspects of this analysis resonate with you? Or is there something specific you'd like to discuss more deeply?` });
    } else {
      this.addMessage('assistant', `Hello! I'm here to help you explore your emotions from a ${PERSPECTIVES[this.currentPerspective].title} perspective. What's on your mind today?`);
    }

    const inputArea = container.createDiv({ cls: 'chat-input-area' });
    this.inputArea = inputArea.createEl('textarea', { cls: 'chat-textarea', attr: { placeholder: 'Share your thoughts...' } });
    const sendBtn = inputArea.createEl('button', { text: 'Send', cls: 'chat-send-btn' });
    sendBtn.onclick = () => { void this.sendMessage(); };
    this.inputArea.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void this.sendMessage(); } };
    return Promise.resolve();
  }

  addMessage(role: 'user' | 'assistant', content: string) {
    const msgDiv = this.messagesContainer.createDiv({ cls: `chat-message ${role}` });
    const actions = msgDiv.createDiv({ cls: 'chat-message-actions' });
    const copyBtn = actions.createEl('button', { text: 'Copy', cls: 'btn-secondary btn-small chat-copy-btn' });
    copyBtn.onclick = async () => {
      try {
        await navigator.clipboard.writeText(content);
        new Notice('Copied to clipboard');
      } catch (error) {
        console.error(error);
        new Notice('Could not copy to clipboard');
      }
    };
    msgDiv.createEl('p', { text: content, cls: 'chat-message-content' });
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  async sendMessage() {
    const content = this.inputArea.value.trim();
    if (!content) return;
    if (!this.plugin.openai) { new Notice('Please set your API key in settings'); return; }

    this.inputArea.value = '';
    this.addMessage('user', content);
    this.chatMessages.push({ role: 'user', content });

    const loadingDiv = this.messagesContainer.createDiv({ cls: 'chat-message assistant loading' });
    loadingDiv.createEl('p', { text: 'Thinking...' });

    try {
      const response = await this.plugin.getSinglePerspectiveResponse(
        this.chatMessages,
        this.currentPerspective,
        this.liveContextTitle || this.liveContextDescription
          ? { title: this.liveContextTitle, description: this.liveContextDescription }
          : undefined
      );
      loadingDiv.remove();
      this.addMessage('assistant', response);
      this.chatMessages.push({ role: 'assistant', content: response });
    } catch (error) {
      loadingDiv.remove();
      this.addMessage('assistant', this.plugin.getOpenAIErrorMessage(error, 'I could not process your message.'));
      new Notice(this.plugin.getOpenAIErrorMessage(error, 'Error processing your message'));
      console.error(error);
    }
  }

  async saveChat() {
    if (this.chatMessages.length === 0) {
      new Notice('No messages to save');
      return;
    }
    try {
      if (!this.sourceFilePath) {
        new Notice('This chat is not linked to a journal analysis note. Use export if you want a separate note.');
        return;
      }
      if (!this.sourcePerspectiveKey && !this.sourceGroupKey) {
        new Notice('This chat is missing its source analysis link. Re-open it from the analysis note and try again.');
        return;
      }
      const messagesToSave = this.chatMessages.filter((message, index) => {
        if (index === 0 && message.role === 'user' && message.content.startsWith('Here is a journal entry I wrote:')) {
          return false;
        }
        if (this.initialAnalysis && message.role === 'assistant' && message.content === this.initialAnalysis) {
          return false;
        }
        return true;
      });
      if (messagesToSave.length === 0) {
        new Notice('No new chat messages to save beyond the existing analysis');
        return;
      }
      const saved = await this.plugin.saveChatBackToSourceNote(
        this.sourceFilePath,
        messagesToSave,
        this.chatStartTime,
        {
          perspectiveKey: this.sourcePerspectiveKey || undefined,
          groupKey: this.sourceGroupKey || undefined,
          speakerTitle: this.sourceTitle || undefined
        }
      );
      if (!saved) {
        new Notice('Could not find the source analysis section in the note. Re-open the chat from the note link and try again.');
        return;
      }
      new Notice('Chat saved back to the source analysis section');
    } catch (error) {
      new Notice('Error saving chat');
      console.error(error);
    }
  }

  async exportToNote() {
    if (this.chatMessages.length === 0) {
      new Notice('No messages to export');
      return;
    }

    await this.plugin.ensureFolder(this.plugin.settings.chatsFolder);
    const timestamp = new Date().toISOString().split('T')[0];
    const sourcePerspectiveKey = this.sourcePerspectiveKey || this.currentPerspective;
    const exportTitle = this.sourceTitle || PERSPECTIVES[sourcePerspectiveKey]?.title || PERSPECTIVES[this.currentPerspective]?.title || 'Unknown';
    const fileLabelKey = this.sourcePerspectiveKey || this.currentPerspective;
    const chatBaseName = this.plugin.buildChatFileBaseName(this.sourceFilePath, fileLabelKey, timestamp, exportTitle);
    const fileName = this.plugin.getUniqueMarkdownPath(this.plugin.settings.chatsFolder, chatBaseName);
    let initialAnalysis = this.initialAnalysis;
    if (!initialAnalysis && this.sourceFilePath && this.sourceGroupKey) {
      const sourceFile = this.plugin.getVaultMarkdownFile(this.sourceFilePath);
      if (sourceFile) {
        const sourceContent = await this.app.vault.read(sourceFile);
        const bounds = this.plugin.findGroupSynthesisSectionBounds(sourceContent, this.sourceGroupKey);
        if (bounds) {
          initialAnalysis = sourceContent.slice(bounds.start, bounds.end)
            .replace(/^###\s+.+$/m, '')
            .replace(/\*\*Continue Group Chat:\*\*.*(?:\n|$)/g, '')
            .replace(/#### Latest AI Chat[\s\S]*$/m, '')
            .trim();
        }
      }
    } else if (!initialAnalysis && this.sourceFilePath && sourcePerspectiveKey) {
      const sourceFile = this.plugin.getVaultMarkdownFile(this.sourceFilePath);
      if (sourceFile) {
        const sourceContent = await this.app.vault.read(sourceFile);
        const sourceAnalysis = this.plugin.extractAnalysisPayloadFromNote(sourceContent);
        initialAnalysis = sourceAnalysis.perspectives[sourcePerspectiveKey] || '';
      }
    }

    let content = `# 💬 ${exportTitle} Chat - ${timestamp}\n\n`;
    content += `**Source Analysis:** ${exportTitle}\n`;
    content += `**Date:** ${this.chatStartTime.toLocaleString()}\n`;
    content += `**Exported:** ${new Date().toLocaleString()}\n\n`;
    if (this.sourceFilePath) {
      content += `**Source Note:** [[${this.plugin.getWikiLinkTarget(this.sourceFilePath)}|${this.plugin.getFileDisplayName(this.sourceFilePath)}]]\n\n`;
      if (this.sourceGroupKey && PERSPECTIVE_GROUPS[this.sourceGroupKey]) {
        content += `**Source Group Synthesis:** [[${this.plugin.getWikiLinkTarget(this.sourceFilePath)}#${PERSPECTIVE_GROUPS[this.sourceGroupKey].title}|${PERSPECTIVE_GROUPS[this.sourceGroupKey].title}]]\n\n`;
      } else if (sourcePerspectiveKey) {
        content += `**Source Analysis Lens:** ${this.plugin.buildPerspectiveSourceNoteLink(this.sourceFilePath, sourcePerspectiveKey)}\n\n`;
      }
    }

    if (this.journalContext) {
      content += `## 📝 Original Journal Entry\n\n`;
      content += `${this.journalContext}\n\n`;
    }

    if (initialAnalysis) {
      content += `## 🔍 Linked Analysis\n\n`;
      content += `${initialAnalysis}\n\n`;
    }

    const exportedConversation = this.chatMessages.filter((message, index) => {
      if (index === 0 && message.role === 'user' && message.content.startsWith('Here is a journal entry I wrote:')) {
        return false;
      }
      if (initialAnalysis && message.role === 'assistant' && message.content === initialAnalysis) {
        return false;
      }
      return true;
    });

    content += `---\n\n## 💬 Conversation\n\n`;
    for (const msg of exportedConversation) {
      if (msg.role === 'user') {
        content += `### You\n\n${msg.content}\n\n`;
      } else {
        content += `### ${exportTitle}\n\n${msg.content}\n\n`;
      }
    }

    content += `---\n\n## 🔍 Key Insights\n\n`;
    content += `*(Add your own reflections here)*\n\n`;
    content += `- \n- \n- \n\n`;

    content += `## 📋 Action items\n\n`;
    content += `- [ ] \n- [ ] \n- [ ] \n`;

    try {
      const file = await this.app.vault.create(fileName, content);
      await this.plugin.openFileInSplit(file);
      new Notice('Chat exported to note');
    } catch (error) {
      new Notice('Could not export chat');
      console.error(error);
    }
  }

  startNewChat() {
    this.chatMessages = [];
    this.chatStartTime = new Date();
    this.journalContext = '';
    this.chatTitle = `Chat - ${new Date().toLocaleDateString()}`;
    this.currentPerspective = 'lacanian_perspective';
    this.sourceChatKind = 'perspective';
    this.sourcePerspectiveKey = '';
    this.sourceGroupKey = '';
    this.sourceTitle = '';
    this.sourceDescription = '';
    this.liveContextTitle = '';
    this.liveContextDescription = '';
    this.sourceFilePath = '';
    this.initialAnalysis = '';
    void this.onOpen(); // Re-render
    new Notice('Started a new chat');
  }

  async onClose() {}
}


// Journal Entry Modal
class JournalEntryModal extends Modal {
  plugin: DeleometerPlugin;
  title: string = '';
  content: string = '';
  moodScore: number = 5;
  entryType: string = 'free_form';
  emotionalTags: string[] = [];
  isSaving: boolean = false;
  suggestedPrompt: string = '';
  isGeneratingPrompt: boolean = false;
  contentArea!: HTMLTextAreaElement;
  promptDisplay!: HTMLElement;
  promptUseBtn!: HTMLButtonElement;

  constructor(app: App, plugin: DeleometerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('deleometer-modal');
    contentEl.createEl('h2', { text: 'New journal entry' });

    // Title
    const titleGroup = contentEl.createDiv({ cls: 'form-group' });
    titleGroup.createEl('label', { text: 'Title' });
    const titleInput = titleGroup.createEl('input', { type: 'text', attr: { placeholder: 'Entry title...' } });
    titleInput.oninput = () => { this.title = titleInput.value; };

    // Entry Type
    const typeGroup = contentEl.createDiv({ cls: 'form-group' });
    typeGroup.createEl('label', { text: 'Entry type' });
    const typeSelect = typeGroup.createEl('select');
    for (const [key, label] of Object.entries(ENTRY_TYPES)) {
      typeSelect.createEl('option', { text: label, value: key });
    }
    typeSelect.onchange = () => { this.entryType = typeSelect.value; };

    const promptGroup = contentEl.createDiv({ cls: 'analysis-section' });
    promptGroup.createEl('label', { text: 'AI writing prompt' });
    const promptBtnRow = promptGroup.createDiv({ cls: 'btn-row' });
    const promptBtn = promptBtnRow.createEl('button', { text: 'Generate prompt', cls: 'btn-secondary' });
    this.promptUseBtn = promptBtnRow.createEl('button', { text: 'Use prompt', cls: 'btn-secondary' });
    this.promptUseBtn.disabled = true;
    this.promptDisplay = promptGroup.createEl('p', {
      text: 'Generate a reflective writing prompt based on your current goals, milestones, and recent patterns.',
      cls: 'analysis-source'
    });
    promptBtn.onclick = () => { void this.generatePrompt(promptBtn); };
    this.promptUseBtn.onclick = () => this.usePrompt();

    // Content
    const contentGroup = contentEl.createDiv({ cls: 'form-group' });
    contentGroup.createEl('label', { text: 'What\'s on your mind?' });
    this.contentArea = contentGroup.createEl('textarea', { attr: { placeholder: 'Write your thoughts...' } });
    this.contentArea.oninput = () => { this.content = this.contentArea.value; };

    // Mood Score
    const moodGroup = contentEl.createDiv({ cls: 'form-group' });
    moodGroup.createEl('label', { text: 'Mood score' });
    const moodSlider = moodGroup.createDiv({ cls: 'mood-slider' });
    moodSlider.createEl('span', { text: '😢' });
    const slider = moodSlider.createEl('input', { type: 'range', attr: { min: '1', max: '10', value: '5' } });
    const moodValue = moodSlider.createEl('span', { text: '5', cls: 'mood-value' });
    moodSlider.createEl('span', { text: '😊' });
    slider.oninput = () => { this.moodScore = parseInt(slider.value); moodValue.textContent = slider.value; };

    // Emotional Tags
    const tagsGroup = contentEl.createDiv({ cls: 'form-group' });
    tagsGroup.createEl('label', { text: 'Emotional tags (comma separated)' });
    const tagsInput = tagsGroup.createEl('input', { type: 'text', attr: { placeholder: 'Anxious, hopeful, confused...' } });
    tagsInput.oninput = () => { this.emotionalTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t); };

    // Buttons
    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'btn-secondary' });
    cancelBtn.onclick = () => this.close();
    const saveBtn = btnRow.createEl('button', { text: 'Save only', cls: 'btn-secondary' });
    saveBtn.onclick = () => { void this.saveEntry(false); };
    const analyzeBtn = btnRow.createEl('button', { text: 'Save and analyze', cls: 'btn-primary' });
    analyzeBtn.onclick = () => { void this.saveEntry(true); };
  }

  async generatePrompt(button: HTMLButtonElement) {
    if (this.isGeneratingPrompt) return;
    if (!this.plugin.openai) {
      new Notice('Please set your API key in settings to generate prompts');
      return;
    }

    this.isGeneratingPrompt = true;
    button.disabled = true;
    button.setText('Generating...');
    this.promptDisplay.setText('Generating a new prompt...');

    try {
      this.suggestedPrompt = await this.plugin.getRandomJournalPrompt();
      this.promptDisplay.setText(this.suggestedPrompt);
      this.promptUseBtn.disabled = !this.suggestedPrompt;
    } catch (error) {
      this.promptDisplay.setText('Could not generate a prompt right now.');
      new Notice(this.plugin.getOpenAIErrorMessage(error, 'Error generating journal prompt'));
      console.error(error);
    } finally {
      this.isGeneratingPrompt = false;
      button.disabled = false;
      button.setText('Generate prompt');
    }
  }

  usePrompt() {
    if (!this.suggestedPrompt) return;

    const prefix = this.contentArea.value.trim() ? '\n\n' : '';
    this.contentArea.value = `${this.contentArea.value}${prefix}${this.suggestedPrompt}\n\n`;
    this.content = this.contentArea.value;
    this.contentArea.focus();
    this.contentArea.selectionStart = this.contentArea.value.length;
    this.contentArea.selectionEnd = this.contentArea.value.length;
  }

  async saveEntry(analyze: boolean) {
    if (this.isSaving) return;
    if (!this.content.trim()) { new Notice('Please write some content'); return; }
    this.isSaving = true;
    try {
      await this.plugin.ensureFolder(this.plugin.settings.journalFolder);
      const date = new Date();
      const safeTitle = this.plugin.sanitizeFileNamePart(this.title || 'journal');
      const fileName = this.plugin.getUniqueMarkdownPath(
        this.plugin.settings.journalFolder,
        `${date.toISOString().split('T')[0]}-${safeTitle}`
      );
      const template = `---
date: ${date.toISOString()}
type: journal
entry_type: ${this.entryType}
mood_score: ${this.moodScore}
emotional_tags: [${this.emotionalTags.map(t => `"${t}"`).join(', ')}]
---

# ${this.title || 'Journal entry'} - ${date.toLocaleDateString()}

${this.content}
`;
      const file = await this.app.vault.create(fileName, template);
      await this.app.workspace.getLeaf().openFile(file);
      new Notice('Journal entry saved!');
      this.close();

      if (analyze) {
        if (!this.plugin.openai) {
          new Notice('Please set your API key in settings to analyze');
          return;
        }
        new Notice('Analyzing with multiple perspectives...');
        try {
          await this.plugin.writeAnalysisStatusToFile(file, 'Analysis started. Longer entries can take several minutes.');
          const savedContent = await this.app.vault.read(file);
          const journalContent = this.plugin.stripFrontmatter(savedContent);
          const analysis = await this.plugin.getMultiPerspectiveAnalysis(journalContent, async (message) => {
            new Notice(message);
            await this.plugin.writeAnalysisStatusToFile(file, message);
          });
          await this.plugin.appendAnalysisToFile(file, analysis);
          new AnalysisResultModal(this.app, this.plugin, analysis, journalContent, file).open();
          new Notice('Analysis added to the note');
        } catch (error) {
          await this.plugin.writeAnalysisStatusToFile(file, `Analysis could not be completed: ${this.plugin.getErrorMessage(error)}`);
          new Notice(this.plugin.getOpenAIErrorMessage(error, 'Error analyzing journal entry'));
          console.error(error);
        }
      }
    } catch (error) {
      new Notice('Could not save journal entry');
      console.error(error);
    } finally {
      this.isSaving = false;
    }
  }

  onClose() { this.contentEl.empty(); }
}


// Goal Modal
class GoalModal extends Modal {
  plugin: DeleometerPlugin;
  goalTitle: string = '';
  description: string = '';
  category: string = 'personal_growth';
  targetDate: string = '';
  milestones: Milestone[] = [];

  constructor(app: App, plugin: DeleometerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('deleometer-modal');
    contentEl.createEl('h2', { text: 'New goal' });

    // Title
    const titleGroup = contentEl.createDiv({ cls: 'form-group' });
    titleGroup.createEl('label', { text: 'Goal title' });
    const titleInput = titleGroup.createEl('input', { type: 'text', attr: { placeholder: 'What do you want to achieve?' } });
    titleInput.oninput = () => { this.goalTitle = titleInput.value; };

    // Description
    const descGroup = contentEl.createDiv({ cls: 'form-group' });
    descGroup.createEl('label', { text: 'Description' });
    const descArea = descGroup.createEl('textarea', { attr: { placeholder: 'Describe your goal in detail...' } });
    descArea.oninput = () => { this.description = descArea.value; };

    // Category
    const catGroup = contentEl.createDiv({ cls: 'form-group' });
    catGroup.createEl('label', { text: 'Category' });
    const catSelect = catGroup.createEl('select');
    for (const [key, label] of Object.entries(GOAL_CATEGORIES)) {
      catSelect.createEl('option', { text: label, value: key });
    }
    catSelect.onchange = () => { this.category = catSelect.value; };

    // Target Date
    const dateGroup = contentEl.createDiv({ cls: 'form-group' });
    dateGroup.createEl('label', { text: 'Target date' });
    const dateInput = dateGroup.createEl('input', { type: 'date' });
    dateInput.oninput = () => { this.targetDate = dateInput.value; };

    // Milestones
    const milestonesGroup = contentEl.createDiv({ cls: 'form-group' });
    milestonesGroup.createEl('label', { text: 'Milestones' });
    const milestonesList = milestonesGroup.createDiv({ cls: 'milestones-list' });
    const addMilestoneDiv = milestonesGroup.createDiv({ cls: 'add-milestone' });
    const milestoneInput = addMilestoneDiv.createEl('input', { type: 'text', attr: { placeholder: 'Add a milestone...' } });
    const addBtn = addMilestoneDiv.createEl('button', { text: '+', cls: 'btn-secondary' });
    addBtn.onclick = () => {
      if (milestoneInput.value.trim()) {
        this.milestones.push({ title: milestoneInput.value.trim(), completed: false });
        this.renderMilestones(milestonesList);
        milestoneInput.value = '';
      }
    };

    // Buttons
    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'btn-secondary' });
    cancelBtn.onclick = () => this.close();
    const saveBtn = btnRow.createEl('button', { text: 'Create goal', cls: 'btn-primary' });
    saveBtn.onclick = () => { void this.saveGoal(); };
  }

  renderMilestones(container: HTMLElement) {
    container.empty();
    this.milestones.forEach((m, i) => {
      const item = container.createDiv({ cls: 'milestone-item' });
      item.createEl('span', { text: `${i + 1}. ${m.title}`, cls: 'milestone-title' });
      const removeBtn = item.createEl('button', { text: '×', cls: 'btn-secondary' });
      removeBtn.onclick = () => { this.milestones.splice(i, 1); this.renderMilestones(container); };
    });
  }

  async saveGoal() {
    if (!this.goalTitle.trim() || !this.description.trim()) { new Notice('Please fill in title and description'); return; }
    await this.plugin.ensureFolder(this.plugin.settings.goalsFolder);
    const date = new Date();
    const fileName = this.plugin.getUniqueMarkdownPath(
      this.plugin.settings.goalsFolder,
      this.plugin.sanitizeFileNamePart(this.goalTitle)
    );
    const template = `---
type: goal
title: "${this.plugin.escapeYamlInlineString(this.goalTitle)}"
description: "${this.plugin.escapeYamlInlineString(this.description)}"
category: ${this.category}
target_date: ${this.targetDate || 'null'}
progress_percentage: 0
status: active
created: ${date.toISOString()}
milestones: ${this.plugin.formatYamlStringArray(this.milestones.map((milestone) => milestone.title))}
---

# 🎯 ${this.goalTitle}

**Category:** ${GOAL_CATEGORIES[this.category]}
**Target Date:** ${this.targetDate || 'Not set'}
**Status:** Active

## Description
${this.description}

## Milestones
${this.milestones.map(m => `- [ ] ${m.title}`).join('\n')}

## Progress Notes

`;
    const file = await this.app.vault.create(fileName, template);
    await this.plugin.syncGoalMilestonesToFolder(file, true);
    const savedGoal = await this.plugin.getGoalFileData(file);
    if (savedGoal) {
      await this.app.vault.modify(file, this.plugin.buildStandardGoalNote(savedGoal));
    }
    await this.plugin.syncGoalFileToFullCalendar(file);
    await this.plugin.openFileInSplit(file);
    new Notice('Goal created!');
    this.close();
  }

  onClose() { this.contentEl.empty(); }
}


class GoalDraftsModal extends Modal {
  plugin: DeleometerPlugin;
  drafts: GoalSuggestion[];
  sourceAnalysisPath: string;

  constructor(app: App, plugin: DeleometerPlugin, drafts: GoalSuggestion[], sourceAnalysisPath: string = '') {
    super(app);
    this.plugin = plugin;
    this.sourceAnalysisPath = sourceAnalysisPath;
    this.drafts = drafts.map((draft) => ({
      ...draft,
      milestones: [...draft.milestones],
      sourcePerspectives: [...draft.sourcePerspectives],
      sourceAnalysisPath: draft.sourceAnalysisPath || sourceAnalysisPath
    }));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('deleometer-modal');
    contentEl.addClass('deleometer-modal-wide');
    contentEl.createEl('h2', { text: 'Draft goals from analysis' });
    contentEl.createEl('p', { text: 'Edit these AI-generated goals before saving them to your goals folder.', cls: 'analysis-source' });

    if (this.drafts.length === 0) {
      contentEl.createEl('p', { text: 'No proposed goals remain. Close this modal or return to the analysis.', cls: 'analysis-source' });
    }

    this.drafts.forEach((draft, index) => {
      const section = contentEl.createDiv({ cls: 'analysis-section' });
      const header = section.createDiv({ cls: 'perspective-header' });
      header.createEl('h4', { text: `Goal ${index + 1}` });
      const deleteBtn = header.createEl('button', { text: 'Delete proposed goal', cls: 'btn-secondary' });
      deleteBtn.onclick = () => {
        this.drafts.splice(index, 1);
        this.onOpen();
      };

      const titleGroup = section.createDiv({ cls: 'form-group' });
      titleGroup.createEl('label', { text: 'Title' });
      const titleInput = titleGroup.createEl('input', { type: 'text', value: draft.title });
      titleInput.oninput = () => { draft.title = titleInput.value; };

      const descGroup = section.createDiv({ cls: 'form-group' });
      descGroup.createEl('label', { text: 'Description' });
      const descArea = descGroup.createEl('textarea', { text: draft.description });
      descArea.oninput = () => { draft.description = descArea.value; };

      const categoryGroup = section.createDiv({ cls: 'form-group' });
      categoryGroup.createEl('label', { text: 'Category' });
      const categorySelect = categoryGroup.createEl('select');
      for (const [key, label] of Object.entries(GOAL_CATEGORIES)) {
        const option = categorySelect.createEl('option', { text: label, value: key });
        if (key === draft.category) option.selected = true;
      }
      categorySelect.onchange = () => { draft.category = categorySelect.value; };

      const dateGroup = section.createDiv({ cls: 'form-group' });
      dateGroup.createEl('label', { text: 'Target date' });
      const dateInput = dateGroup.createEl('input', { type: 'date' });
      dateInput.value = draft.targetDate || '';
      dateInput.oninput = () => { draft.targetDate = dateInput.value; };

      const milestonesGroup = section.createDiv({ cls: 'form-group' });
      milestonesGroup.createEl('label', { text: 'Milestones (one per line)' });
      const milestonesArea = milestonesGroup.createEl('textarea', { text: draft.milestones.join('\n') });
      milestonesArea.oninput = () => {
        draft.milestones = milestonesArea.value.split('\n').map((line) => line.trim()).filter(Boolean);
      };

      if (draft.sourcePerspectives.length > 0) {
        section.createEl('p', {
          text: `Source perspectives: ${draft.sourcePerspectives.map((key) => PERSPECTIVES[key]?.title || key).join(', ')}`,
          cls: 'analysis-source'
        });
      }
    });

    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'btn-secondary' });
    cancelBtn.onclick = () => this.close();
    const saveBtn = btnRow.createEl('button', { text: 'Save draft goals', cls: 'btn-primary' });
    saveBtn.disabled = this.drafts.length === 0;
    saveBtn.onclick = () => { void this.saveGoals(); };
  }

  async saveGoals() {
    const validDrafts = this.drafts.filter((draft) => draft.title.trim() && draft.description.trim());
    if (validDrafts.length === 0) {
      new Notice('No valid goal drafts to save');
      return;
    }

    try {
      let lastFile: TFile | null = null;
      for (const draft of validDrafts) {
        lastFile = await this.plugin.saveGeneratedGoal(draft);
      }

      if (lastFile) {
        await this.plugin.openFileInSplit(lastFile);
      }

      new Notice(`Saved ${validDrafts.length} goal draft${validDrafts.length === 1 ? '' : 's'}!`);
      this.close();
    } catch (error) {
      new Notice('Could not save goal drafts');
      console.error(error);
    }
  }

  onClose() { this.contentEl.empty(); }
}

class GoalConsolidationModal extends Modal {
  plugin: DeleometerPlugin;
  drafts: GoalMergeDraft[];

  constructor(app: App, plugin: DeleometerPlugin, drafts: GoalMergeDraft[]) {
    super(app);
    this.plugin = plugin;
    this.drafts = drafts.map((draft) => ({
      ...draft,
      sourceGoals: [...draft.sourceGoals],
      mergedMilestones: [...draft.mergedMilestones],
      mergedSourcePerspectives: [...draft.mergedSourcePerspectives]
    }));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('deleometer-modal');
    contentEl.addClass('deleometer-modal-wide');
    contentEl.createEl('h2', { text: 'Consolidate similar goals' });
    contentEl.createEl('p', { text: 'Review the suggested groups below. Saving will keep one consolidated goal note and mark the others as merged redirects.', cls: 'analysis-source' });

    this.drafts.forEach((draft, index) => {
      const section = contentEl.createDiv({ cls: 'analysis-section' });
      section.createEl('h4', { text: `Group ${index + 1}` });
      section.createEl('p', { text: `Source goals: ${draft.sourceGoals.map((goal) => goal.title).join(', ')}`, cls: 'analysis-source' });

      const titleGroup = section.createDiv({ cls: 'form-group' });
      titleGroup.createEl('label', { text: 'Merged title' });
      const titleInput = titleGroup.createEl('input', { type: 'text', value: draft.mergedTitle });
      titleInput.oninput = () => { draft.mergedTitle = titleInput.value; };

      const descGroup = section.createDiv({ cls: 'form-group' });
      descGroup.createEl('label', { text: 'Merged description' });
      const descArea = descGroup.createEl('textarea', { text: draft.mergedDescription });
      descArea.oninput = () => { draft.mergedDescription = descArea.value; };

      const categoryGroup = section.createDiv({ cls: 'form-group' });
      categoryGroup.createEl('label', { text: 'Category' });
      const categorySelect = categoryGroup.createEl('select');
      for (const [key, label] of Object.entries(GOAL_CATEGORIES)) {
        const option = categorySelect.createEl('option', { text: label, value: key });
        if (draft.mergedCategory === key) option.selected = true;
      }
      categorySelect.onchange = () => { draft.mergedCategory = categorySelect.value; };

      const dateGroup = section.createDiv({ cls: 'form-group' });
      dateGroup.createEl('label', { text: 'Target date' });
      const dateInput = dateGroup.createEl('input', { type: 'date' });
      dateInput.value = draft.mergedTargetDate || '';
      dateInput.oninput = () => { draft.mergedTargetDate = dateInput.value || undefined; };

      const milestonesGroup = section.createDiv({ cls: 'form-group' });
      milestonesGroup.createEl('label', { text: 'Merged milestones (one per line)' });
      const milestonesArea = milestonesGroup.createEl('textarea', { text: draft.mergedMilestones.join('\n') });
      milestonesArea.oninput = () => {
        draft.mergedMilestones = milestonesArea.value.split('\n').map((line) => line.trim()).filter(Boolean);
      };
    });

    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'btn-secondary' });
    cancelBtn.onclick = () => this.close();
    const saveBtn = btnRow.createEl('button', { text: 'Merge suggested goals', cls: 'btn-primary' });
    saveBtn.onclick = () => { void this.save(); };
  }

  async save() {
    const validDrafts = this.drafts.filter((draft) => draft.mergedTitle.trim() && draft.mergedDescription.trim() && draft.sourceGoals.length > 1);
    if (validDrafts.length === 0) {
      new Notice('No valid goal consolidations to save');
      return;
    }

    try {
      await this.plugin.consolidateGoalDrafts(validDrafts);
      await this.plugin.syncAllGoalsToFullCalendar(false);
      this.close();
    } catch (error) {
      new Notice('Could not consolidate goals');
      console.error(error);
    }
  }

  onClose() { this.contentEl.empty(); }
}

class MilestoneConsolidationModal extends Modal {
  plugin: DeleometerPlugin;
  drafts: MilestoneMergeDraft[];

  constructor(app: App, plugin: DeleometerPlugin, drafts: MilestoneMergeDraft[]) {
    super(app);
    this.plugin = plugin;
    this.drafts = drafts.map((draft) => ({
      ...draft,
      sourceMilestones: [...draft.sourceMilestones],
      mergedGoalPaths: [...draft.mergedGoalPaths],
      mergedGoalTitles: [...draft.mergedGoalTitles],
      mergedSourcePerspectives: [...draft.mergedSourcePerspectives]
    }));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('deleometer-modal');
    contentEl.addClass('deleometer-modal-wide');
    contentEl.createEl('h2', { text: 'Consolidate similar milestones' });
    contentEl.createEl('p', { text: 'Review the suggested groups below. Saving will keep one consolidated milestone note and mark the others as merged redirects.', cls: 'analysis-source' });

    this.drafts.forEach((draft, index) => {
      const section = contentEl.createDiv({ cls: 'analysis-section' });
      section.createEl('h4', { text: `Group ${index + 1}` });
      section.createEl('p', { text: `Source milestones: ${draft.sourceMilestones.map((milestone) => milestone.title).join(', ')}`, cls: 'analysis-source' });

      const titleGroup = section.createDiv({ cls: 'form-group' });
      titleGroup.createEl('label', { text: 'Merged title' });
      const titleInput = titleGroup.createEl('input', { type: 'text', value: draft.mergedTitle });
      titleInput.oninput = () => { draft.mergedTitle = titleInput.value; };

      const descGroup = section.createDiv({ cls: 'form-group' });
      descGroup.createEl('label', { text: 'Merged description' });
      const descArea = descGroup.createEl('textarea', { text: draft.mergedDescription });
      descArea.oninput = () => { draft.mergedDescription = descArea.value; };

      const dateGroup = section.createDiv({ cls: 'form-group' });
      dateGroup.createEl('label', { text: 'Target date' });
      const dateInput = dateGroup.createEl('input', { type: 'date' });
      dateInput.value = draft.mergedTargetDate || '';
      dateInput.oninput = () => { draft.mergedTargetDate = dateInput.value || undefined; };

      const goalsGroup = section.createDiv({ cls: 'form-group' });
      goalsGroup.createEl('label', { text: 'Related goal titles (one per line)' });
      const goalsArea = goalsGroup.createEl('textarea', { text: draft.mergedGoalTitles.join('\n') });
      goalsArea.oninput = () => {
        draft.mergedGoalTitles = goalsArea.value.split('\n').map((line) => line.trim()).filter(Boolean);
      };
    });

    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    const cancelBtn = btnRow.createEl('button', { text: 'Cancel', cls: 'btn-secondary' });
    cancelBtn.onclick = () => this.close();
    const saveBtn = btnRow.createEl('button', { text: 'Merge suggested milestones', cls: 'btn-primary' });
    saveBtn.onclick = () => { void this.save(); };
  }

  async save() {
    const validDrafts = this.drafts.filter((draft) => draft.mergedTitle.trim() && draft.mergedDescription.trim() && draft.sourceMilestones.length > 1);
    if (validDrafts.length === 0) {
      new Notice('No valid milestone consolidations to save');
      return;
    }

    try {
      await this.plugin.consolidateMilestoneDrafts(validDrafts);
      this.close();
    } catch (error) {
      new Notice('Could not consolidate milestones');
      console.error(error);
    }
  }

  onClose() { this.contentEl.empty(); }
}


// Personality Assessment Modal
class PersonalityAssessmentModal extends Modal {
  plugin: DeleometerPlugin;
  currentQuestion: number = 0;
  answers: number[] = [];

  constructor(app: App, plugin: DeleometerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    this.renderQuestion();
  }

  renderQuestion() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('deleometer-modal');

    if (this.currentQuestion >= ASSESSMENT_QUESTIONS.length) {
      this.showResults();
      return;
    }

    const q = ASSESSMENT_QUESTIONS[this.currentQuestion];
    const progress = ((this.currentQuestion) / ASSESSMENT_QUESTIONS.length) * 100;

    contentEl.createEl('h2', { text: 'Personality assessment' });

    const progressDiv = contentEl.createDiv({ cls: 'assessment-progress' });
    const progressBar = progressDiv.createDiv({ cls: 'progress-bar' });
    const progressFill = progressBar.createDiv({ cls: 'progress-fill' });
    progressFill.style.width = `${progress}%`;
    progressDiv.createEl('p', { text: `Question ${this.currentQuestion + 1} of ${ASSESSMENT_QUESTIONS.length}`, cls: 'progress-text' });

    const questionDiv = contentEl.createDiv({ cls: 'assessment-question' });
    questionDiv.createEl('h3', { text: q.question });

    const optionsDiv = questionDiv.createDiv({ cls: 'scale-options' });
    SCALE_LABELS.forEach((label, i) => {
      const option = optionsDiv.createDiv({ cls: 'scale-option' });
      option.createEl('span', { text: label });
      option.onclick = () => {
        this.answers.push(i + 1);
        this.currentQuestion++;
        this.renderQuestion();
      };
    });
  }

  showResults() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('deleometer-modal');

    const scores = this.calculateScores();
    const profile: PersonalityProfile = {
      big_five_scores: scores,
      assessment_date: new Date().toISOString(),
      dominant_traits: this.getDominantTraits(scores),
      psychological_type: this.getPsychologicalType(scores),
      growth_areas: this.getGrowthAreas(scores)
    };

    this.plugin.settings.personalityProfile = profile;
    void this.plugin.saveSettings();

    contentEl.createEl('h2', { text: 'Your personality profile' });

    const chart = contentEl.createDiv({ cls: 'big-five-chart' });
    const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'] as const;
    for (const trait of traits) {
      const score = scores[trait];
      const bar = chart.createDiv({ cls: 'trait-bar' });
      bar.createDiv({ cls: 'trait-label', text: trait.charAt(0).toUpperCase() + trait.slice(1) });
      const progress = bar.createDiv({ cls: 'trait-progress' });
      const fill = progress.createDiv({ cls: `trait-fill ${trait}` });
      fill.style.width = `${score}%`;
      bar.createDiv({ cls: 'trait-score', text: `${score}` });
    }

    const summary = contentEl.createDiv({ cls: 'analysis-section' });
    summary.createEl('h4', { text: 'Summary' });
    summary.createEl('p', { text: profile.psychological_type });

    const dominant = contentEl.createDiv({ cls: 'analysis-section' });
    dominant.createEl('h4', { text: 'Dominant traits' });
    dominant.createEl('p', { text: profile.dominant_traits.join(', ') });

    const growth = contentEl.createDiv({ cls: 'analysis-section' });
    growth.createEl('h4', { text: 'Growth areas' });
    growth.createEl('p', { text: profile.growth_areas.join(', ') });

    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    const closeBtn = btnRow.createEl('button', { text: 'Close', cls: 'btn-primary' });
    closeBtn.onclick = () => this.close();
  }

  calculateScores(): BigFiveScores {
    const traitScores: Record<string, number[]> = { openness: [], conscientiousness: [], extraversion: [], agreeableness: [], neuroticism: [] };
    ASSESSMENT_QUESTIONS.forEach((q, i) => {
      let score = this.answers[i];
      if (q.reverse) score = 8 - score;
      traitScores[q.trait].push(score);
    });
    const result: BigFiveScores = { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 };
    for (const trait of Object.keys(result) as (keyof BigFiveScores)[]) {
      const avg = traitScores[trait].reduce((a, b) => a + b, 0) / traitScores[trait].length;
      result[trait] = Math.round((avg / 7) * 100);
    }
    return result;
  }

  getDominantTraits(scores: BigFiveScores): string[] {
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 3).map(([trait]) => trait.charAt(0).toUpperCase() + trait.slice(1));
  }

  getPsychologicalType(scores: BigFiveScores): string {
    const high = Object.entries(scores).filter(([, v]) => v >= 60).map(([k]) => k);
    if (high.includes('openness') && high.includes('extraversion')) return 'Creative explorer - You thrive on new experiences and social connections.';
    if (high.includes('conscientiousness') && high.includes('agreeableness')) return 'Reliable helper - You are dependable and care deeply about others.';
    if (high.includes('openness') && high.includes('neuroticism')) return 'Sensitive artist - You experience emotions deeply and express them creatively.';
    if (high.includes('extraversion') && high.includes('agreeableness')) return 'Social connector - You build bridges between people and communities.';
    return 'Balanced individual - You have a well-rounded personality profile.';
  }

  getGrowthAreas(scores: BigFiveScores): string[] {
    const areas: string[] = [];
    if (scores.openness < 40) areas.push('Exploring new experiences');
    if (scores.conscientiousness < 40) areas.push('Building consistent habits');
    if (scores.extraversion < 40) areas.push('Expanding social connections');
    if (scores.agreeableness < 40) areas.push('Developing empathy');
    if (scores.neuroticism > 60) areas.push('Emotional regulation');
    return areas.length ? areas : ['Continue your balanced growth'];
  }

  onClose() { this.contentEl.empty(); }
}


// Analysis Result Modal - Shows multi-perspective analysis with option to chat
class AnalysisResultModal extends Modal {
  plugin: DeleometerPlugin;
  analysis: AnalysisPayload;
  originalContent: string;
  sourceFile: TFile | null;

  constructor(app: App, plugin: DeleometerPlugin, analysis: AnalysisPayload, originalContent: string = '', sourceFile: TFile | null = null) {
    super(app);
    this.plugin = plugin;
    this.analysis = analysis;
    this.originalContent = originalContent;
    this.sourceFile = sourceFile;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.addClass('deleometer-modal');
    contentEl.addClass('deleometer-modal-medium');
    contentEl.createEl('h2', { text: 'Multi-perspective analysis' });

    if (this.sourceFile) {
      contentEl.createEl('p', { text: `Analysis of: ${this.sourceFile.basename}`, cls: 'analysis-source' });
    }

    const results = contentEl.createDiv({ cls: 'analysis-results' });
    for (const groupKey of getChronologicalGroupKeys()) {
      const groupEntries = Object.entries(this.analysis.perspectives)
        .filter(([perspKey]) => PERSPECTIVES[perspKey]?.group === groupKey);
      if (groupEntries.length === 0) continue;

      const group = PERSPECTIVE_GROUPS[groupKey];
      const groupHeader = results.createDiv({ cls: 'perspective-group-heading' });
      groupHeader.createEl('h3', { text: group.title });
      groupHeader.createEl('p', { text: group.description });

      for (const [perspKey, analysisContent] of groupEntries) {
        const persp = PERSPECTIVES[perspKey];
        const card = results.createDiv({ cls: 'perspective-card' });

        const header = card.createDiv({ cls: 'perspective-header' });
        header.createEl('h4', { text: persp?.title || perspKey });

        // Chat button for this perspective
        const chatBtn = header.createEl('button', { text: 'Chat with this perspective', cls: 'chat-with-btn' });
        chatBtn.onclick = () => { void this.openChatWithPerspective(perspKey, analysisContent); };

        card.createEl('p', { text: analysisContent });
        const readings = this.analysis.furtherReadings[perspKey] || [];
        if (readings.length > 0) {
          card.createEl('h5', { text: 'Further readings' });
          const readingsList = card.createEl('ul');
          for (const reading of readings) {
            readingsList.createEl('li', { text: reading });
          }
        }
      }
    }

    if (Object.keys(this.analysis.groupSyntheses).length > 0) {
      const synthesisSection = contentEl.createDiv({ cls: 'analysis-section' });
      synthesisSection.createEl('h3', { text: 'Group syntheses' });
      for (const [groupKey, content] of Object.entries(this.analysis.groupSyntheses)) {
        const group = PERSPECTIVE_GROUPS[groupKey];
        const synthesisCard = synthesisSection.createDiv({ cls: 'perspective-card' });
        const header = synthesisCard.createDiv({ cls: 'perspective-header' });
        header.createEl('h4', { text: group?.title || groupKey });
        const chatBtn = header.createEl('button', { text: 'Chat with this synthesis', cls: 'chat-with-btn' });
        chatBtn.onclick = () => { void this.openChatWithGroupSynthesis(groupKey, content); };
        synthesisCard.createEl('p', { text: content });
      }
    }

    if (this.analysis.philosophicalReaccumulation) {
      const philosophySection = contentEl.createDiv({ cls: 'analysis-section' });
      philosophySection.createEl('h3', { text: 'Philosophy re-accumulation' });
      philosophySection.createEl('p', { text: this.analysis.philosophicalReaccumulation });
    }

    if (this.analysis.analysisWarnings.length > 0) {
      const warningSection = contentEl.createDiv({ cls: 'analysis-section' });
      warningSection.createEl('h3', { text: 'Analysis notes' });
      const warningList = warningSection.createEl('ul');
      for (const warning of this.analysis.analysisWarnings) {
        warningList.createEl('li', { text: warning });
      }
    }

    if (this.analysis.authorMemorySummary) {
      const memorySection = contentEl.createDiv({ cls: 'analysis-section' });
      memorySection.createEl('h4', { text: 'Author memory' });
      memorySection.createEl('p', { text: this.analysis.authorMemorySummary });
    }

    // Append analysis to note button
    if (this.sourceFile) {
      const appendBtn = contentEl.createEl('button', {
        text: 'Append analysis to note',
        cls: 'btn-secondary analysis-append-button'
      });
      appendBtn.onclick = () => { void this.appendAnalysisToNote(); };
    }

    const btnRow = contentEl.createDiv({ cls: 'btn-row' });
    if (this.analysis.goalSuggestions.length > 0) {
      const goalBtn = btnRow.createEl('button', { text: 'Draft goals from analysis', cls: 'btn-secondary' });
      goalBtn.onclick = () => this.openGoalDrafts();
    }
    const closeBtn = btnRow.createEl('button', { text: 'Close', cls: 'btn-primary' });
    closeBtn.onclick = () => this.close();
  }

  async openChatWithPerspective(perspectiveKey: string, initialAnalysis: string) {
    if (this.sourceFile) {
      await this.plugin.appendAnalysisToFile(this.sourceFile, this.analysis);
    }
    this.close();
    this.plugin.pendingChatContext = {
      chatKind: 'perspective',
      perspective: perspectiveKey,
      journalContent: this.originalContent,
      initialAnalysis,
      sourceFilePath: this.sourceFile?.path || '',
      sourceTitle: PERSPECTIVES[perspectiveKey]?.title || perspectiveKey,
      sourceDescription: PERSPECTIVES[perspectiveKey]?.description || ''
    };
    await this.plugin.activateAIChatView();
    new Notice(`Opening chat with ${PERSPECTIVES[perspectiveKey]?.title || perspectiveKey} perspective`);
  }

  async openChatWithGroupSynthesis(groupKey: string, initialAnalysis: string) {
    if (this.sourceFile) {
      await this.plugin.appendAnalysisToFile(this.sourceFile, this.analysis);
    }
    this.close();
    const group = PERSPECTIVE_GROUPS[groupKey];
    this.plugin.pendingChatContext = {
      chatKind: 'group_synthesis',
      perspective: this.plugin.getDefaultPerspectiveForGroup(groupKey),
      journalContent: this.originalContent,
      initialAnalysis,
      sourceFilePath: this.sourceFile?.path || '',
      sourceGroupKey: groupKey,
      sourceTitle: `${group?.title || groupKey} synthesis`,
      sourceDescription: `${group?.description || ''}. This chat begins from the synthesis across the perspectives in this group.`
    };
    await this.plugin.activateAIChatView();
    new Notice(`Opening chat with ${group?.title || groupKey} synthesis`);
  }

  async appendAnalysisToNote() {
    if (!this.sourceFile) return;
    await this.plugin.appendAnalysisToFile(this.sourceFile, this.analysis);
    new Notice('Analysis appended to note!');
  }

  openGoalDrafts() {
    new GoalDraftsModal(this.app, this.plugin, this.analysis.goalSuggestions, this.sourceFile?.path || '').open();
  }

  onClose() { this.contentEl.empty(); }
}

// Settings Tab
class DeleometerSettingTab extends PluginSettingTab {
  plugin: DeleometerPlugin;

  constructor(app: App, plugin: DeleometerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('p', {
      text: 'Configure journal analysis, goals, and calendar sync.',
      cls: 'setting-item-description'
    });
    new Setting(containerEl)
      .setName('Safety and interpretation')
      .setDesc(SAFETY_DISCLAIMER)
      .setHeading();

    new Setting(containerEl)
      .setName('Security and privacy')
      .setDesc(PRIVACY_SECURITY_NOTICE)
      .setHeading();

    new Setting(containerEl)
      .setName('API key')
      .setDesc(this.plugin.settings.openaiApiKey
        ? 'Your API key is hidden on screen, but it is still stored locally in Obsidian plugin data and may be included in vault backups or sync.'
        : 'Your API key for AI analysis. It will be hidden on screen after you paste it, but stored locally in Obsidian plugin data.')
      .addText((text) => {
        text.inputEl.type = 'password';
        text.inputEl.autocomplete = 'off';
        text.inputEl.spellcheck = false;
        text
          .setPlaceholder('Paste your API key')
          .setValue(this.plugin.settings.openaiApiKey)
          .onChange(async (value) => {
            this.plugin.settings.openaiApiKey = value;
            await this.plugin.saveSettings();
            if (value) this.plugin.initializeOpenAI();
          });
      })
      .addButton((button) => button
        .setButtonText('Clear key')
        .onClick(async () => {
          this.plugin.settings.openaiApiKey = '';
          this.plugin.openai = null;
          await this.plugin.saveSettings();
          this.display();
        }));

    new Setting(containerEl)
      .setName('Redact common sensitive details before AI calls')
      .setDesc('Redacts email addresses, web links, phone numbers, and simple street addresses before text leaves Obsidian. This is a helper, not perfect anonymization.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.redactSensitiveDataBeforeAI)
        .onChange(async (value) => {
          this.plugin.settings.redactSensitiveDataBeforeAI = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Author memory')
      .setDesc('Keep a continuing local author memory summary. Turn this off if you do not want ongoing memory stored in plugin data.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.enableAuthorMemory)
        .onChange(async (value) => {
          this.plugin.settings.enableAuthorMemory = value;
          await this.plugin.saveSettings();
          this.display();
        }))
      .addButton((button) => button
        .setButtonText('Clear memory')
        .onClick(async () => {
          this.plugin.settings.authorMemorySummary = '';
          await this.plugin.saveSettings();
          new Notice('Author memory cleared');
        }));

    new Setting(containerEl)
      .setName('Share author memory with AI')
      .setDesc('When enabled, the local author memory summary is included in AI prompts. Disable this to keep memory local only.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.includeAuthorMemoryInAI)
        .onChange(async (value) => {
          this.plugin.settings.includeAuthorMemoryInAI = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Share personality profile with AI')
      .setDesc('When enabled, the personality assessment summary can be included in AI prompts. Disable this to keep it local only.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.includePersonalityProfileInAI)
        .onChange(async (value) => {
          this.plugin.settings.includePersonalityProfileInAI = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Send full journal entry into perspective chat')
      .setDesc('Off by default. If disabled, perspective chat receives excerpts plus the selected analysis, not the entire journal entry.')
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.sendFullJournalToChat)
        .onChange(async (value) => {
          this.plugin.settings.sendFullJournalToChat = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Journal folder')
      .setDesc('Folder for journal entries')
      .addText(text => text
        .setValue(this.plugin.settings.journalFolder)
        .onChange(async (value) => {
          this.plugin.settings.journalFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Goals folder')
      .setDesc('Folder for goals')
      .addText(text => text
        .setValue(this.plugin.settings.goalsFolder)
        .onChange(async (value) => {
          this.plugin.settings.goalsFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Milestones folder')
      .setDesc('Folder for generated milestone notes. These notes can be reviewed and consolidated separately from goals.')
      .addText(text => text
        .setValue(this.plugin.settings.milestonesFolder)
        .onChange(async (value) => {
          this.plugin.settings.milestonesFolder = value;
          await this.plugin.saveSettings();
        }))
      .addButton((button) => button
        .setButtonText('Sync now')
        .onClick(async () => {
          await this.plugin.syncAllGoalMilestonesToFolder(true);
        }))
      .addButton((button) => button
        .setButtonText('Consolidate')
        .onClick(async () => {
          await this.plugin.openMilestoneConsolidationModal();
        }));

    new Setting(containerEl).setName('Calendar integration').setHeading();

    new Setting(containerEl)
      .setName('Calendar folder')
      .setDesc('Folder watched by your calendar plugin local calendar source. Deleometer will create dated event notes here.')
      .addText(text => text
        .setValue(this.plugin.settings.fullCalendarFolder)
        .onChange(async (value) => {
          this.plugin.settings.fullCalendarFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto-sync goals to calendar')
      .setDesc('Create or update calendar event notes whenever a goal is created or saved from analysis.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSyncGoalsToFullCalendar)
        .onChange(async (value) => {
          this.plugin.settings.autoSyncGoalsToFullCalendar = value;
          await this.plugin.saveSettings();
        }))
      .addButton((button) => button
        .setButtonText('Sync now')
        .onClick(async () => {
          await this.plugin.syncAllGoalsToFullCalendar(true);
        }));

    new Setting(containerEl)
      .setName('Analysis reader level')
      .setDesc('Sets the zone of proximal development for analysis explanations, so key terms are taught at the right level.')
      .addDropdown((dropdown) => {
        for (const [key, level] of Object.entries(ZPD_LEVELS)) {
          dropdown.addOption(key, level.label);
        }
        dropdown
          .setValue(this.plugin.settings.zpdLevel)
          .onChange(async (value) => {
            this.plugin.settings.zpdLevel = ZPD_LEVELS[value] ? value : 'tertiary_year_2';
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('Analysis output language')
      .setDesc('Sets the language for generated analyses, syntheses, goals, chat replies, and journaling prompts.')
      .addDropdown((dropdown) => {
        for (const [key, language] of Object.entries(OUTPUT_LANGUAGES)) {
          dropdown.addOption(key, language.label);
        }
        dropdown
          .setValue(this.plugin.settings.outputLanguage)
          .onChange(async (value) => {
            this.plugin.settings.outputLanguage = OUTPUT_LANGUAGES[value] ? value : 'english';
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl).setName('Analysis perspectives').setHeading();
    containerEl.createEl('p', {
      text: 'Select which perspectives to use for journal analysis. The order follows strict chronology inside each group. Tradition, placement, chronology, and lineage labels are guiding maps to intellectual history, not exclusive ownership claims.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('Enable all perspectives')
      .setDesc('Turn on every available analysis type.')
      .addButton((button) => button
        .setButtonText('Enable all')
        .onClick(async () => {
          this.plugin.settings.selectedPerspectives = getChronologicalPerspectiveKeys();
          await this.plugin.saveSettings();
          this.display();
        }));

    for (const groupKey of getChronologicalGroupKeys()) {
      const group = PERSPECTIVE_GROUPS[groupKey];
      new Setting(containerEl)
        .setName(group.title)
        .setDesc(group.description)
        .setHeading()
        .addButton((button) => button
          .setButtonText('Enable group')
          .onClick(async () => {
            const groupPerspectiveKeys = Object.entries(PERSPECTIVES)
              .filter(([, perspective]) => perspective.group === groupKey)
              .map(([key]) => key);
            this.plugin.settings.selectedPerspectives = Array.from(new Set([
              ...this.plugin.settings.selectedPerspectives,
              ...groupPerspectiveKeys
            ]));
            await this.plugin.saveSettings();
            this.display();
          }))
        .addButton((button) => button
          .setButtonText('Disable group')
          .onClick(async () => {
            const groupPerspectiveKeys = new Set(Object.entries(PERSPECTIVES)
              .filter(([, perspective]) => perspective.group === groupKey)
              .map(([key]) => key));
            this.plugin.settings.selectedPerspectives = this.plugin.settings.selectedPerspectives
              .filter((key) => !groupPerspectiveKeys.has(key));
            await this.plugin.saveSettings();
            this.display();
          }));

      const orderedGroupPerspectives = getChronologicalPerspectiveKeys()
        .filter((key) => PERSPECTIVES[key]?.group === groupKey)
        .map((key) => [key, PERSPECTIVES[key]] as const);

      for (const [key, persp] of orderedGroupPerspectives) {
        const setting = new Setting(containerEl)
          .setName(persp.title)
          .setDesc(persp.description)
          .addToggle(toggle => toggle
            .setValue(this.plugin.settings.selectedPerspectives.includes(key))
            .onChange(async (value) => {
              if (value) {
                if (!this.plugin.settings.selectedPerspectives.includes(key)) {
                  this.plugin.settings.selectedPerspectives.push(key);
                }
              } else {
                this.plugin.settings.selectedPerspectives = this.plugin.settings.selectedPerspectives.filter(p => p !== key);
              }
              await this.plugin.saveSettings();
            }));

        const historyLabel = buildPerspectiveHistoryLabel(key, persp);
        if (historyLabel) {
          setting.descEl.createDiv({ text: historyLabel, cls: 'setting-item-description' });
        }
      }
    }
  }
}
