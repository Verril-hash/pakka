// What Bolna extracts from every Pakka Check call. Each item becomes one key under
// extracted_data["Listing Check"] in the execution and the webhook payload.

export const category = { name: 'Listing Check', model: 'gpt-5.4-mini' };

const yesNoUnknown = (yes, no) => [
  { value: 'yes', condition: yes },
  { value: 'no', condition: no },
  { value: 'unknown', condition: 'Not discussed or unclear from the call' },
];

export const dispositions = [
  {
    name: 'call_outcome',
    question: 'How did the call end up?',
    is_subjective: false,
    is_objective: true,
    objective_options: [
      { value: 'confirmed', condition: 'The person answered and the main listing details were discussed' },
      { value: 'rented', condition: 'The person said the flat is already rented or no longer available' },
      { value: 'call_later', condition: 'The person was busy and asked to be called at another time' },
      { value: 'do_not_call', condition: 'The person asked not to be called again or was clearly annoyed' },
      { value: 'wrong_number', condition: 'The person said this is a wrong number or knows nothing about the flat' },
      { value: 'no_conversation', condition: 'Nobody really spoke, or the call dropped before any answer' },
    ],
  },
  {
    name: 'available',
    question: 'Is the flat still available for rent?',
    is_subjective: false,
    is_objective: true,
    objective_options: yesNoUnknown('The person confirmed it is still available', 'The person said it is rented or not available'),
  },
  {
    name: 'rent',
    question: 'What monthly rent in rupees did the person clearly confirm or state in reply to the rent question? Give only the number, e.g. 23000. The agent reading out a figure does not count: if the person never actually answered about rent (talked over it, said hello, moved on), leave it empty.',
    is_subjective: true,
    is_objective: false,
    subjective_type: 'numeric',
  },
  {
    name: 'deposit',
    question: 'What security deposit in rupees did the person clearly confirm or state in reply to the deposit question? Give only the number, e.g. 100000 for one lakh. The agent reading out a figure does not count: if the person never actually answered about the deposit, leave it empty.',
    is_subjective: true,
    is_objective: false,
    subjective_type: 'numeric',
  },
  {
    name: 'price_changed',
    question: 'Did the person say the rent or deposit is different from what the agent read out?',
    is_subjective: false,
    is_objective: true,
    objective_options: yesNoUnknown('Rent or deposit is different from what the agent said', 'The person agreed the rent and deposit are unchanged'),
  },
  {
    name: 'tenant_preference',
    question: 'Which tenants does the person prefer?',
    is_subjective: true,
    is_objective: true,
    objective_options: [
      { value: 'family', condition: 'Only or mainly families' },
      { value: 'bachelors', condition: 'Working bachelors or students are preferred or fine' },
      { value: 'anyone', condition: 'Any tenant is fine' },
      { value: 'unknown', condition: 'Not discussed' },
    ],
  },
  {
    name: 'house_rules',
    question: 'List any rules or restrictions the person mentioned (food, pets, timings, visitors, etc.) in one short English line. Empty if none.',
    is_subjective: true,
    is_objective: false,
  },
  {
    name: 'tenant_question_answer',
    question: "What was the person's answer to the tenant's specific question the agent asked (for example about pets)? One short English line. Empty if it wasn't asked.",
    is_subjective: true,
    is_objective: false,
  },
  {
    name: 'visit_slot',
    question: 'When did the person say tenants can come to see the flat? Day and time in short English, e.g. "Sunday 6 PM". Empty if not discussed.',
    is_subjective: true,
    is_objective: false,
  },
  {
    name: 'is_broker',
    question: 'Is the person a broker or agent rather than the owner? Base it on what they said and how they talked about the flat.',
    is_subjective: true,
    is_objective: true,
    objective_options: [
      { value: 'owner', condition: 'They said they are the owner, or clearly spoke as the owner' },
      { value: 'broker', condition: 'They said they are a broker or agent, mentioned commission or brokerage, or manage many flats' },
      { value: 'family_or_caretaker', condition: 'A relative, caretaker or watchman managing it for the owner' },
      { value: 'unknown', condition: 'Not clear from the call' },
    ],
  },
  {
    name: 'available_from',
    question: 'From when can a tenant move in? Short English, e.g. "Immediately", "1 December", "January 2027". Empty if not discussed.',
    is_subjective: true,
    is_objective: false,
  },
  {
    name: 'other_notes',
    question: 'List anything else useful the person mentioned that is not covered above: who can show the flat (caretaker, neighbour), owner travelling, maintenance, parking, other flats for rent, or concerns. One or two short English lines. Empty if nothing.',
    is_subjective: true,
    is_objective: false,
  },
  {
    name: 'language',
    question: 'Which language did the person mostly speak in?',
    is_subjective: false,
    is_objective: true,
    objective_options: [
      { value: 'en', condition: 'English' },
      { value: 'kn', condition: 'Kannada' },
      { value: 'hi', condition: 'Hindi' },
      { value: 'ta', condition: 'Tamil' },
      { value: 'other', condition: 'Another language or mixed beyond these' },
    ],
  },
];
