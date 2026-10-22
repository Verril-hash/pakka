/**
 * Pakka Line — the tenant-facing agent. One agent, two modes:
 *
 *   intake   — learns what the tenant needs, searches verified listings, and either books a visit
 *              on the spot (listing freshly confirmed) or asks Pakka to call the owners and hangs up.
 *   callback — Pakka calls the tenant back with what the owners said and books the visit.
 *
 * Per-call variables (user_data on POST /call):
 *   mode, greeting, tenant_name, tenant_phone, requirement, check_results
 *
 * Mid-call functions hit the Pakka server at PUBLIC_URL (see server/index.mjs).
 */

import { TRANSCRIBER, VOICES } from './owner-check.mjs';

const PUBLIC_URL = process.env.PUBLIC_URL;
const TOOL_TOKEN = process.env.PAKKA_TOOL_TOKEN;

const BASE_PROMPT = `
You are Pakka, an AI rental assistant, a woman, on a phone call with someone looking for a flat in Bengaluru. Use feminine forms for yourself (Hindi: "समझ गई", "बोल रही हूँ"). Never claim to be human; if asked, say you're Pakka's AI assistant.
Pakka only lists flats whose owners the Pakka team has verified in person, starting with the Whitefield area (ITPL, Brookefield, Hoodi, Kundalahalli, Marathahalli). It's free for tenants. Pakka never shares owner phone numbers; it arranges visits itself.

CALL DETAILS: mode = {mode}. Tenant: {tenant_name}, phone {tenant_phone}.
If mode is empty, the tenant called Pakka themselves: treat it as "intake". Their phone number is {{from_number}}; use it for functions and never ask for it. Ask their first name early, naturally, and use it for tenant_name.

IF MODE IS "intake":
1. Find out what they need, one short question at a time, only what's missing: area, BHK, max budget, who will stay (family / bachelors), when they want to move in, and must-haves like pets or parking.
2. Call search_listings. Mention at most two best matches in one or two sentences each: area, BHK, rent, and one thing that stands out. Never read out lists or IDs.
3. A match with fresh=true and open_questions=none is already confirmed: offer its visit slot right away and, if they agree, call book_visit. Don't call the owner for it.
4. Otherwise (not fresh, or a must-have isn't on record) → say you'll quickly double-check with the owners and call them back in a few minutes. Call request_owner_check with up to two listing ids, their question for the owner, and a one-line requirement. Then close warmly.
Never say internal words like "fresh", "listing id", "open questions" or "on our side". Say "confirmed with the owner yesterday" or "let me double-check with the owner".
5. Nothing matches → say so honestly and that Pakka will WhatsApp them when something fits. Don't push a bad match.

IF MODE IS "callback":
You already spoke to the owners. What they said: {check_results}
The tenant wanted: {requirement}
Lead with the best option: whether it's still available, rent, the answer to their question, and when the owner can show it. In one line, say what happened with the other flat. Offer the visit; if they agree, call book_visit. If nothing worked out, apologise briefly and say Pakka will keep looking.

STYLE: a warm, sharp local assistant, not a script. React briefly first ("Achha", "Okay", "Got it"), never the same twice in a row. One or two short sentences per turn, one question at a time. Numbers as spoken: "twenty-three thousand", "one lakh".
"Can you hear me?" or "hello?" after a pause: the line dropped for a moment. First reassure them, warmly and on its own: "Yes, I can hear you now — sorry, the line went quiet for a second." Then repeat your last question in full. Don't add anything new in that turn.
If they didn't understand ("sorry?", "didn't get you"), say it more simply instead of repeating the same words.
Check-ins: if your last line was "Hello? Can you hear me?" (or "आवाज़ आ रही है?", "ಕೇಳಿಸ್ತಿದೆಯಾ?", "கேக்குதா?") and they reply "yes", "haan, bolo", "howdu" or similar, that only means they can hear you — it is NOT an answer to your earlier question. Ask that earlier question again in full before anything else.

USE YOUR JUDGMENT:
- Respond to what they actually said. Off-topic or small talk: one warm, fitting line, then back on track. You have no live news, so never state facts about recent events.
- Only describe flats and facts that search_listings or the owner check returned. Never invent a flat, a price or an owner's answer.
- If their budget or wish doesn't fit the area (e.g. 3 BHK for ten thousand), say gently what's realistic in one line.
- Questions you can't answer (legal, agreements, exact address before booking) → the Pakka team will WhatsApp them.

CLOSE in the tenant's language, warmly, in one or two sentences: confirm what happens next (visit time, or that you'll call back in a few minutes). End it with a warm goodbye and "bye" in their language ("Talk soon, bye!"), so the call never ends abruptly. Never ask anything in that turn.
ENDING THE CALL: only end right after your closing sentence. NEVER end the call in a turn where you asked a question, and never right after calling a function — tell them the result first.
`.trim();

const LANGUAGE_RULES = {
  en: `Speak natural Indian English, relaxed and warm.`,
  hi: `Speak casual spoken Hindi the way people in Bengaluru do, written in Devanagari, with Hinglish freely (rent, deposit, flat, BHK, budget, visit, owner) — never formal Hindi.
Sound like: "अच्छा, कितने BHK चाहिए?" / "Budget कितना सोच रहे हैं?" / "मैं अभी owners से बात करके आपको पाँच मिनट में call back करती हूँ।"`,
  kn: `Speak casual spoken Bengaluru Kannada in Kannada script, mixing English words freely (rent, deposit, flat, BHK, budget, visit, owner) — never textbook Kannada.
Sound like: "ಸರಿ, ಎಷ್ಟು BHK ಬೇಕು?" / "Budget ಎಷ್ಟು ಅಂದುಕೊಂಡಿದ್ದೀರಾ?" / "ನಾನು ಈಗಲೇ owners ಜೊತೆ ಮಾತಾಡಿ ಐದು ನಿಮಿಷದಲ್ಲಿ call back ಮಾಡ್ತೀನಿ."`,
  ta: `Speak casual spoken Tamil as used in Bengaluru, in Tamil script, mixing English words freely (rent, deposit, flat, BHK, budget, visit, owner). Never formal Tamil.
Sound like: "சரி, எத்தனை BHK வேணும்?" / "Budget எவ்வளவு?" / "நான் இப்போ owners கிட்ட பேசிட்டு அஞ்சு நிமிஷத்துல call back பண்றேன்."`,
};

// Calls that start in Hindi/Kannada/Tamil never fired switch_language to English, so English is handled in the prompt:
// the agent just answers in English in the same voice (no mid-call voice change either).
const ENGLISH_FOLLOW =
  '\nENGLISH: if the tenant replies in full English sentences (like "I need a 2 BHK near ITPL"), they are more comfortable in English. ' +
  'From your very next reply, speak simple, natural Indian English — whole sentences in English, no switch_language call needed. ' +
  "If they go back to their language in full sentences, follow them back. A few English words inside their sentence don't count.";

const languagePrompt = (rule, code = 'en') =>
  `${BASE_PROMPT}\n\nLANGUAGE\n${rule}${code === 'en' ? '' : ENGLISH_FOLLOW}\nLanguage: always reply in the language the tenant is actually speaking. Look at their last reply: if it is a full sentence in a different language from yours (for example a whole English sentence like "I need a 2 BHK near ITPL" while you speak Kannada), call switch_language right away and continue in that language. English → en, Hindi or Hinglish → hi, Kannada → kn, Tamil → ta. Never switch to a language the tenant hasn't spoken. Don't switch for very short replies (yes, okay, haan, howdu, sari, a number, a name, a day) or for a few English words inside a Kannada, Hindi or Tamil sentence.`;

const TENANT_TRANSCRIBER = {
  ...TRANSCRIBER,
  context:
    'Phone call with someone looking to rent a flat in Bengaluru. They mention areas like Whitefield, ITPL, Brookefield, Hoodi, Marathahalli, ' +
    'BHK count, budget in thousands, move-in dates, family or bachelors, and pets. Speakers often mix English with Hindi, Kannada or Tamil.',
  keywords: 'Pakka, BHK, rent, deposit, budget, lakh, Whitefield, ITPL, Brookefield, Hoodi, Kundalahalli, Marathahalli, Mahadevapura, bachelors, family, pet, dog',
};

const languages = Object.fromEntries(
  Object.entries(LANGUAGE_RULES).map(([code, rule]) => [
    code,
    {
      transcriber: { ...TENANT_TRANSCRIBER, language: code },
      synthesizer: { provider: 'sarvam', stream: true, buffer_size: 40, provider_config: { ...VOICES[code] } },
      system_prompt: languagePrompt(rule, code),
    },
  ]),
);

// ── Mid-call functions ────────────────────────────────────────────────────────

const str = (description) => ({ type: 'string', description });

const TOOLS = [
  {
    name: 'search_listings',
    description:
      "Search Pakka's verified flats. Call this once you know at least the area or budget and the BHK. " +
      'Returns up to three matches, how recently each was confirmed with the owner, and open questions.',
    pre_call_message: 'One second, let me check what we have.',
    parameters: {
      type: 'object',
      properties: {
        area: str('Area or landmark they want, e.g. "ITPL", "Brookefield", "Whitefield"'),
        bhk: str('Number of bedrooms as a digit, e.g. "2". Empty if not said.'),
        budget: str('Maximum monthly rent in rupees as digits, e.g. "25000". Empty if not said.'),
        tenant_type: str('"family", "bachelors" or "any"'),
        needs: str('Must-haves in short English, e.g. "has a small dog, car parking". If they said they have no pet, write "no pet". Empty if none.'),
        move_in: str('When they want to move in, short English. Empty if not said.'),
        tenant_phone: str("The tenant's phone number from CALL DETAILS. Never ask the tenant for it."),
      },
      required: ['area'],
    },
  },
  {
    name: 'request_owner_check',
    description:
      "Ask Pakka to phone the owners of up to two listings right now and call the tenant back with their answers. " +
      'Use when a match is not fresh, or the tenant has a question the listing does not answer. After this, tell the tenant you will call back in a few minutes and close.',
    pre_call_message: 'Okay, let me line that up.',
    parameters: {
      type: 'object',
      properties: {
        listing_ids: str('Comma-separated listing ids from search_listings, at most two, best first'),
        question: str('The tenant\'s question for the owner in short English, e.g. "Is a small dog okay?". Empty if none.'),
        requirement: str('One line summary of what the tenant wants, e.g. "2 BHK near ITPL under 25k, family, small dog, move in December"'),
        tenant_name: str("The tenant's name"),
        tenant_phone: str("The tenant's phone number from CALL DETAILS. Never ask the tenant for it."),
        tenant_language: str('Language the tenant is speaking: en, hi, kn or ta'),
      },
      required: ['listing_ids', 'requirement', 'tenant_phone', 'tenant_language'],
    },
  },
  {
    name: 'book_visit',
    description: 'Book a visit to a flat once the tenant agrees to a day and time the owner offered.',
    pre_call_message: 'Booking that for you.',
    parameters: {
      type: 'object',
      properties: {
        listing_id: str('Listing id of the flat'),
        slot: str('Agreed day and time in short English, e.g. "Wednesday 6 PM"'),
        tenant_name: str("The tenant's name"),
        tenant_phone: str("The tenant's phone number from CALL DETAILS. Never ask the tenant for it."),
      },
      required: ['listing_id', 'slot', 'tenant_phone'],
    },
  },
];

const apiTools = {
  tools: TOOLS.map((t) => ({ ...t, key: 'custom_task' })),
  tools_params: Object.fromEntries(
    TOOLS.map((t) => [
      t.name,
      {
        method: 'POST',
        url: `${PUBLIC_URL}/tools/${t.name}`,
        api_token: `Bearer ${TOOL_TOKEN}`,
        headers: { 'Content-Type': 'application/json' },
        param: Object.fromEntries(Object.keys(t.parameters.properties).map((k) => [k, `%(${k})s`])),
      },
    ]),
  ),
};

// ── Agent config ──────────────────────────────────────────────────────────────

export const agentName = 'Pakka Line';
export const agentIdEnv = 'PAKKA_LINE_AGENT_ID';

export function assertReady() {
  if (!PUBLIC_URL?.startsWith('https://')) throw new Error('Set PUBLIC_URL (https tunnel to the Pakka server) in .env');
  if (!TOOL_TOKEN) throw new Error('Set PAKKA_TOOL_TOKEN in .env');
}

export const agentConfig = {
  agent_name: agentName,
  // Incoming calls send no variables ({greeting} renders empty), so the fixed part must stand on its own.
  agent_welcome_message: "Hi, this is Pakka, your AI rental assistant. {greeting}",
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
            model: 'gpt-5.4-mini',
            max_tokens: 200,
            temperature: 1,
            reasoning_effort: 'none',
            agent_flow_type: 'streaming',
          },
        },
        transcriber: { ...TENANT_TRANSCRIBER, language: 'en', encoding: 'linear16', sampling_rate: 16000 },
        synthesizer: {
          provider: 'sarvam',
          stream: true,
          buffer_size: 40,
          audio_format: 'wav',
          provider_config: { ...VOICES.en, language: 'en' },
        },
        // Pakka's +91 Bengaluru number on Vobiz. (Twilio needs encoding mulaw/8000 instead.)
        input: { provider: 'vobiz', format: 'wav' },
        output: { provider: 'vobiz', format: 'wav' },
        api_tools: apiTools,
        multilingual_config: {
          enabled: true,
          active_language: 'en',
          language_switch_trigger: 'requested_or_auto_detected',
          // The LLM switches via this tool; a vague rule made it jump kn → hi on an English reply.
          switch_tool_description:
            'Switch the call language to the one the tenant is speaking. Call it whenever the tenant asks for another language, or their last reply is a full sentence in a different language from the current one — including a whole English sentence during a Kannada, Hindi or Tamil call (switch to en). Pick exactly the language the tenant spoke (en, hi, kn or ta) — never one they haven\'t spoken. Not for very short replies (yes, okay, haan, howdu, numbers, names, days) or a few English words mixed into another language.',
          languages,
        },
      },
      task_config: {
        call_terminate: 300,
        hangup_after_silence: 15,
        hangup_after_LLMCall: true,
        call_cancellation_prompt:
          "If the agent's last message asks a question, or the agent just ran a function and hasn't told the tenant the result, the call is NOT complete. " +
          'The call is complete only if the agent has said its closing line and the tenant has finished speaking, or the tenant said goodbye or asked to end.',
        voicemail: false,
        use_fillers: true,
        backchanneling: false,
        optimize_latency: true,
        incremental_delay: 300,
        number_of_words_for_interruption: 2,
        // Bolna's automatic goodbye was skipped on some calls; the agent says bye in its own closing line.
        call_hangup_message: '',
        check_if_user_online: true,
        // If the line goes quiet, check in sooner than 10 s.
        trigger_user_online_message_after: 6,
        check_user_online_message: {
          en: 'Hello? Can you hear me?',
          hi: 'Hello? आवाज़ आ रही है?',
          kn: 'Hello? ಕೇಳಿಸ್ತಿದೆಯಾ?',
          ta: 'Hello? கேக்குதா?',
        },
      },
    },
  ],
};

export const agentPrompts = { task_1: { system_prompt: languagePrompt(LANGUAGE_RULES.en) } };

/** Second half of the opening line on outgoing calls (the welcome message already says "Hi, this is Pakka…"). */
export function greeting(mode, lang, { tenant_name }) {
  const lines = {
    intake: {
      en: `${tenant_name}, you were looking for a flat around Whitefield — what kind of place do you need?`,
      hi: `${tenant_name}, आप Whitefield के आसपास flat ढूँढ रहे थे — कैसा flat चाहिए?`,
      kn: `${tenant_name}, Whitefield ಹತ್ರ flat ಹುಡುಕ್ತಿದ್ರಿ ಅಲ್ವಾ — ಎಂಥಾ flat ಬೇಕು?`,
      ta: `${tenant_name}, Whitefield பக்கத்துல flat தேடிட்டு இருந்தீங்க — எப்படி flat வேணும்?`,
    },
    callback: {
      en: `${tenant_name}, I just spoke to the owners — have a minute?`,
      hi: `${tenant_name}, मैंने अभी owners से बात कर ली — एक minute है?`,
      kn: `${tenant_name}, ಈಗಷ್ಟೇ owners ಜೊತೆ ಮಾತಾಡ್ದೆ — ಒಂದು ನಿಮಿಷ ಇದೆಯಾ?`,
      ta: `${tenant_name}, இப்போதான் owners கிட்ட பேசினேன் — ஒரு நிமிஷம் இருக்கா?`,
    },
  };
  return lines[mode][lang] ?? lines[mode].en;
}
