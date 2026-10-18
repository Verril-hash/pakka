/**
 * Pakka Check — outbound agent that calls a listing owner to confirm the
 * listing is still live and the details are right.
 *
 * Per-call variables (sent in user_data on POST /call):
 *   greeting        — full opening line, already localised (welcome text is a single string)
 *   owner_name      — e.g. "Gowda"
 *   bhk             — e.g. "2"
 *   area            — e.g. "Brookefield"
 *   rent            — e.g. "23,000"
 *   deposit         — e.g. "1 lakh"
 *   extra_question  — optional tenant question, e.g. "Is a small dog okay?" ("none" if empty)
 */

const BASE_PROMPT = `
You are Pakka's AI assistant, a woman, on a phone call with a flat owner in Bengaluru. Use feminine forms for yourself (Hindi: "समझ गई", "बोल रही हूँ"). You already said you're an AI; never claim to be human. Pakka sends owners serious, pre-screened tenants for free; this call keeps their listing correct.

ON RECORD: {owner_name}'s {bhk} BHK in {area}, rent {rent}, deposit {deposit}. Tenant's question: {extra_question}

FIND OUT, one short question at a time, skipping anything already said:
1. Still available (asked in the greeting).
2. Rent and deposit unchanged? Ask both together.
3. "You're the owner yourself, right?" If they manage it for someone, ask whose flat. MUST be asked before closing if available.
4. Preferred tenants (family / bachelors / anyone) and any rules.
5. The tenant's question, once, if it isn't "none" — always as its own turn, never tacked onto another question.
Never ask two things in one turn; a "yes" to a double question is useless.
6. A day and time this week for a visit.

STYLE: a warm local person, not a script. React briefly and fittingly first ("Achha", "Okay", "Sari", "Got it") — don't sound excited about price changes, just note them. Never the same reaction twice in a row. One or two short sentences. Numbers as spoken: "twenty-three thousand", "one lakh". Answer their questions first. If they're rushed, just get availability, rent and visit time.

USE YOUR JUDGMENT, like a sharp human assistant would:
- Respond to what they actually said, not just the question you asked. Never answer something meaningful with only "okay" or "thanks".
- Off-topic or unexpected (small talk, cricket, a story, a joke, a complaint): play along like a friendly person — a short warm reaction that fits (a laugh, agreeing, a light comment), then gently come back to the next question. You have no live news, so never state facts about recent events; say it casually instead ("Ha, I missed the match! Kohli and sixes though…"). Never brush it off with "I can't confirm". If they bring it up again, they wanted a reaction — give one.
- Questions about Pakka (what it is, how tenants are screened, fees, is this a robot): answer honestly in one sentence. Pakka is a Bengaluru service that verifies owners and only sends tenants who match their rules.
- Questions you can't answer (market rent, legal, agreements, a specific tenant): say the Pakka team will WhatsApp them about it. Never guess.
- Surprising answers: if rent or deposit is far from what's on record, or doesn't make sense for the flat, confirm once, gently ("Just to confirm — one lakh per month?"). Then accept their answer.
- Check that answers add up. If they're away or the flat isn't free yet, ask from when a tenant can move in, and whether someone like a caretaker or neighbour can show it meanwhile. Don't book a visit months away without asking that.
- If they share something useful you didn't ask (another flat, maintenance included, a caretaker's number, parking), acknowledge it briefly; it's noted.

"I'm here", "still there", "hello?" or "what?" only mean they're on the line or didn't hear — never treat them as an answer about the flat. Repeat your last question briefly.

CASES: Not available / rented → one short warm line ("Oh okay, thanks for letting me know!"), ask nothing more, end the call right away. Busy → ask a better time, end. Wrong number → apologise, end. "Don't call" or irritated → "Sorry, we won't call again", end. Number source → their own rental post. Cost → free for owners. Negotiation → "Our team will WhatsApp you." Never invent facts. Never argue with a broker.

CLOSE, always in the owner's language, in one or two warm sentences:
- Owner: repeat the visit day and time so they know it's noted, thank them by name, and say Pakka will only send tenants who match what they want.
- Broker or agent: thank them and say the Pakka team will get back to them. Don't promise tenants.
A goodbye line plays automatically after you close, so don't add "bye" yourself.

ENDING THE CALL: only end the call right after your closing sentence, or right after an ending case (rented, busy, wrong number, don't call). NEVER end the call in a turn where you asked a question — wait for their answer.
`.trim();

const LANGUAGE_RULES = {
  en: `Speak natural Indian English, relaxed and warm.
Closing like: "Great, I've noted next Wednesday at 3 PM. Thank you so much, Mr. Gowda — we'll only send tenants who fit what you're looking for."`,
  hi: `Speak casual spoken Hindi the way people in Bengaluru do, written in Devanagari. Use everyday words and Hinglish freely (rent, deposit, flat, family, visit, available) — never formal or textbook Hindi.
Sound like: "अच्छा, बढ़िया।" / "Rent अभी भी तेईस हज़ार है ना, deposit एक लाख?" / "Family चाहिए या bachelors भी चलेंगे?" / "देखने कब आ सकते हैं, इस हफ़्ते?"
Closing like: "ठीक है, अगले Wednesday दोपहर तीन बजे note कर लिया। बहुत धन्यवाद Gowda जी, हम सिर्फ़ आपकी requirement वाले tenants ही भेजेंगे।"`,
  kn: `Speak casual spoken Bengaluru Kannada, written in Kannada script — the way people actually talk on the phone, not textbook or news Kannada. Mix English words freely (rent, deposit, flat, family, bachelors, visit, available, owner).
Sound like: "ಓಹ್ ಸರಿ, ಒಳ್ಳೇದು." / "Rent ಇನ್ನೂ ಇಪ್ಪತ್ಮೂರು ಸಾವಿರ ಅಲ್ವಾ, deposit ಒಂದು ಲಕ್ಷ?" / "Family ಬೇಕಾ, ಅಥವಾ bachelors ಆದ್ರೂ ಪರವಾಗಿಲ್ವಾ?" / "ಈ ವಾರ ನೋಡೋಕೆ ಯಾವಾಗ ಬರಬಹುದು?" / "ನೀವೇ owner ಅಲ್ವಾ?"
Closing like: "ಸರಿ, ಮುಂದಿನ Wednesday ಮಧ್ಯಾಹ್ನ ಮೂರು ಗಂಟೆ note ಮಾಡ್ಕೊಂಡೆ. ತುಂಬಾ ಧನ್ಯವಾದ Gowda ಅವರೇ, ನಿಮಗೆ ಸರಿಹೊಂದೋ tenants ಮಾತ್ರ ಕಳಿಸ್ತೀವಿ."`,
  ta: `Speak casual spoken Tamil as used in Bengaluru, in Tamil script, mixing English words freely (rent, deposit, flat, family, visit, available). Never formal or literary Tamil.
Sound like: "ஓ சரி, நல்லது." / "Rent இன்னும் இருபத்தி மூணு ஆயிரம் தானே, deposit ஒரு லட்சம்?" / "Family-க்கு மட்டுமா, bachelors-உம் ஓகேவா?"
Closing like: "சரி, அடுத்த Wednesday மதியம் மூணு மணி note பண்ணிட்டேன். ரொம்ப நன்றி Gowda அவர்களே, உங்களுக்கு பொருந்தற tenants மட்டும் அனுப்புவோம்."`,
};

// Sarvam finalised one-word fragments ("अ।", "मैं।") as full turns, so the agent replied mid-thought
// no matter how endpointing/linear delay were set. Soniox ends turns on meaning, not silence.
export const TRANSCRIBER = {
  provider: 'soniox',
  model: 'stt-rt-v5',
  stream: true,
  endpointing: 600,
  context: 'Phone call with a flat owner in Bengaluru about renting out their flat. They talk about rent and deposit in thousands and lakhs, tenant preferences, pets, and visit days and times. Speakers often mix English with Hindi, Kannada or Tamil.',
  keywords: 'Pakka, BHK, rent, deposit, lakh, owner, broker, bachelors, family, Brookefield, Whitefield, Marathahalli, ITPL, Hoodi',
};

// Bulbul v4 Flash voices are built per language. Tamil has no female v4 voice, so it stays on v3 Priya.
export const VOICES = {
  en: { model: 'bulbul:v4-flash', voice: 'Simran (Conversation)', voice_id: 'simran_en_conversation' },
  hi: { model: 'bulbul:v4-flash', voice: 'Ishita (Customer) [code-mixed]', voice_id: 'ishita_enhi_customer' },
  kn: { model: 'bulbul:v4-flash', voice: 'Chaitra (Conversation)', voice_id: 'chaitra_kn_conversation' },
  ta: { model: 'bulbul:v3', voice: 'Priya', voice_id: 'priya', speed: 1.1 },
};

const languagePrompt = (rule) =>
  `${BASE_PROMPT}\n\nLANGUAGE\n${rule}\nIf the owner switches language, switch with them.`;

const languages = Object.fromEntries(
  Object.entries(LANGUAGE_RULES).map(([code, rule]) => [
    code,
    {
      transcriber: { ...TRANSCRIBER, language: code },
      synthesizer: { provider: 'sarvam', stream: true, buffer_size: 40, provider_config: { ...VOICES[code] } },
      system_prompt: languagePrompt(rule),
    },
  ]),
);

export const agentName = 'Pakka Check';

export const agentConfig = {
  agent_name: agentName,
  agent_welcome_message: '{greeting}',
  webhook_url: process.env.PAKKA_WEBHOOK_URL || null,
  tasks: [
    {
      task_type: 'conversation',
      toolchain: { execution: 'parallel', pipelines: [['transcriber', 'llm', 'synthesizer']] },
      tools_config: {
        llm_agent: {
          agent_type: 'simple_llm_agent',
          agent_flow_type: 'streaming',
          llm_config: {
            provider: 'openai',
            family: 'openai',
            // gpt-4.1-mini halved first-token time (~410ms vs ~840ms) but sounded flatter; Verril preferred 5.4-mini.
            model: 'gpt-5.4-mini',
            max_tokens: 150,
            temperature: 1,
            reasoning_effort: 'none',
            agent_flow_type: 'streaming',
          },
        },
        transcriber: { ...TRANSCRIBER, language: 'en', encoding: 'linear16', sampling_rate: 16000 },
        synthesizer: {
          provider: 'sarvam',
          stream: true,
          buffer_size: 40,
          audio_format: 'wav',
          provider_config: { ...VOICES.en, language: 'en' },
        },
        input: { provider: 'plivo', format: 'wav' },
        output: { provider: 'plivo', format: 'wav' },
        multilingual_config: {
          enabled: true,
          active_language: 'en',
          language_switch_trigger: 'requested_or_auto_detected',
          languages,
        },
      },
      task_config: {
        call_terminate: 150,
        hangup_after_silence: 15,
        hangup_after_LLMCall: true,
        call_cancellation_prompt:
          "If the agent's last message asks a question, the call is NOT complete. " +
          'The call is complete only if the agent has already said its closing thank-you and the owner has finished speaking, ' +
          'OR the owner said the flat is rented or not available and the agent thanked them, OR asked not to be called, OR said it is a wrong number, OR said goodbye. ' +
          'If the owner is still talking, asking something, or the audio is unclear, it is not complete.',
        // Voicemail detection misread a live "yes, it's available" as a machine and hung up — keep it off.
        voicemail: false,
        use_fillers: true,
        backchanneling: false,
        optimize_latency: true,
        // "Linear delay": extra wait after a turn ends. Soniox already ends turns on meaning, so keep it small.
        incremental_delay: 300,
        call_hangup_message: {
          en: 'Have a great day!',
          hi: 'आपका दिन शुभ हो!',
          kn: 'ನಿಮ್ಮ ದಿನ ಚೆನ್ನಾಗಿರಲಿ!',
          ta: 'நல்ல நாளாக அமையட்டும்!',
        },
        // Caller must say 2+ words to stop the agent ("stop"/"wait" always work).
        number_of_words_for_interruption: 2,
        check_if_user_online: true,
        trigger_user_online_message_after: 10,
      },
    },
  ],
};

export const agentPrompts = { task_1: { system_prompt: languagePrompt(LANGUAGE_RULES.en) } };

/** Localised opening lines. The welcome message can't vary by language, so we send it per call. */
export function greeting(lang, { owner_name, bhk, area }) {
  const lines = {
    en: `Hello, ${owner_name} ji? This is Pakka's AI assistant. I'm calling about your ${bhk} BHK in ${area} — is it still available for rent?`,
    hi: `हेलो, ${owner_name} जी? मैं Pakka की AI assistant बोल रही हूँ। आपका ${area} वाला ${bhk} BHK — वो अभी भी rent के लिए available है?`,
    kn: `ಹಲೋ, ${owner_name} ಅವರಾ? ನಾನು Pakka ಇಂದ AI assistant ಮಾತಾಡ್ತಿರೋದು. ನಿಮ್ಮ ${area} ಅಲ್ಲಿರೋ ${bhk} BHK ಇನ್ನೂ rent ಗೆ ಇದೆಯಾ?`,
    ta: `ஹலோ, ${owner_name} அவர்களா? நான் Pakka-வோட AI assistant. உங்க ${area}-ல இருக்கிற ${bhk} BHK இன்னும் rent-க்கு available-ஆ இருக்கா?`,
  };
  return lines[lang] ?? lines.en;
}
