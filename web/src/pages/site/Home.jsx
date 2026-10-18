import { ChevronRight, PhoneOff, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import CallMeForm from '../../components/CallMeForm';
import HowItWorksScroll from '../../components/HowItWorksScroll';
import LiveCallDemo from '../../components/LiveCallDemo';
import Reveal from '../../components/Reveal';

const SCRIPTS = [
  { word: 'ಕನ್ನಡ', name: 'Kannada', line: 'ನಿಮ್ಮ flat ಇನ್ನೂ rent ಗೆ ಇದೆಯಾ?' },
  { word: 'हिंदी', name: 'Hindi', line: 'आपका flat अभी भी available है?' },
  { word: 'தமிழ்', name: 'Tamil', line: 'உங்க flat இன்னும் available-ஆ?' },
  { word: 'English', name: 'English', line: 'Is the flat still available?' },
];

function Section({ dark, grey, className = '', children, id, backdrop }) {
  return (
    <section id={id} className={`relative scroll-mt-12 ${dark ? 'bg-black text-white' : grey ? 'bg-canvas' : 'bg-white'} ${className}`}>
      {backdrop}
      <div className="relative mx-auto max-w-[1080px] px-5">{children}</div>
    </section>
  );
}

function Tile({ className = '', dark, children }) {
  return (
    <Reveal className={`overflow-hidden rounded-[28px] p-8 md:p-10 ${dark ? 'bg-dark-card text-white' : 'bg-white'} ${className}`}>
      {children}
    </Reveal>
  );
}

/** A real Bengaluru-style home, faded into the hero: visible at the edges, clear behind the headline. */
function HeroBackdrop() {
  const mask = 'radial-gradient(ellipse 46% 52% at 50% 40%, transparent 0%, rgba(0,0,0,.25) 45%, #000 100%)';
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[700px] overflow-hidden">
      <img
        src="/images/hero-home.jpg"
        alt=""
        className="h-full w-full scale-105 object-cover object-[50%_35%] opacity-[.32] saturate-[.85]"
        style={{ WebkitMaskImage: mask, maskImage: mask }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white" />
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_100%,rgba(0,239,254,.10),transparent)]" />
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* ── Hero ───────────────────────────────────────── */}
      <Section className="overflow-hidden pb-24 pt-16 md:pt-24" backdrop={<HeroBackdrop />}>
        <div className="text-center">
          <p className="animate-fade-up text-[17px] font-semibold text-pakka-600 md:text-[21px]">Now in India</p>
          <h1 className="mx-auto mt-3 animate-fade-up text-[56px] font-semibold leading-[1.02] tracking-tightest text-ink-900 [animation-delay:80ms] md:text-[96px]">
            Every listing.<br />
            <span className="text-gradient-brand">Pakka.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] animate-fade-up text-[19px] leading-[1.42] text-ink-500 [animation-delay:160ms] md:text-[24px]">
            Verified by a person. Then confirmed by a phone call, in the owner's own language.
          </p>
          <div className="mt-9 flex animate-fade-up items-center justify-center gap-6 [animation-delay:240ms]">
            <Link to="/flats" className="btn-primary h-11 px-6 text-[17px]">Find a flat</Link>
            <a href="#call" className="link inline-flex items-center text-[17px]">Get a call from Pakka <ChevronRight size={18} /></a>
          </div>
        </div>
        <div className="mt-16 animate-fade-up [animation-delay:380ms] md:mt-20">
          <LiveCallDemo />
        </div>
      </Section>

      {/* ── Statement ─────────────────────────────────── */}
      <Section dark className="py-28 md:py-40">
        <Reveal>
          <h2 className="max-w-[900px] text-[40px] font-semibold leading-[1.08] tracking-display md:text-[64px]">
            <span className="text-gradient-dark">That flat you're about to call? It might already be gone.</span>{' '}
            <span className="text-ink-500">The owner just never said so.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-10 max-w-[620px] text-[19px] leading-relaxed text-ink-400 md:text-[21px]">
            Listings go stale the day they're posted. Brokers pose as owners. The rules that matter, like families only, no pets or veg only, never make it into the post.
            <span className="text-white"> So Pakka asks the one person who knows: the owner. Every few days, on a quick call.</span>
          </p>
        </Reveal>
      </Section>

      {/* ── Languages ─────────────────────────────────── */}
      <Section dark className="pb-28 md:pb-40">
        <Reveal>
          <p className="text-[17px] font-semibold text-pakka-400 md:text-[21px]">Speaks like Bengaluru speaks.</p>
        </Reveal>
        <div className="mt-8 grid gap-x-10 gap-y-12 md:grid-cols-2">
          {SCRIPTS.map((s, i) => (
            <Reveal key={s.name} delay={i * 90}>
              <p className="text-[64px] font-semibold leading-none tracking-display md:text-[96px]">{s.word}</p>
              <p className="mt-4 text-[17px] text-ink-400">“{s.line}”</p>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <p className="mt-16 max-w-[640px] text-[19px] leading-relaxed text-ink-400 md:text-[21px]">
            Every call starts in the owner's language and follows them when they switch, mid-sentence, Kanglish and Hinglish included. It waits while they think, and double-checks a number that sounds off.
          </p>
        </Reveal>
      </Section>

      {/* ── Trust bento ───────────────────────────────── */}
      <Section grey id="trust" className="py-28 md:py-36">
        <Reveal className="text-center">
          <h2 className="text-[40px] font-semibold tracking-display md:text-[56px]">Trust, built twice.</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[19px] text-ink-500 md:text-[21px]">A person checks it once. A phone call keeps it true. AI can't verify trust, but it can stop trust from going stale.</p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          <Tile className="md:col-span-4 md:row-span-2">
            <p className="eyebrow">Verified in person</p>
            <h3 className="mt-2 text-[32px] font-semibold leading-tight tracking-display md:text-[40px]">Someone from Pakka met the owner. And saw the flat.</h3>
            <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-ink-500">Every listing starts with a real visit: identity checked, ownership confirmed, the flat seen with our own eyes. No exceptions, no scraped posts.</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[15px] font-semibold text-white"><ShieldCheck size={18} />Verified by Verril</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-[15px] font-semibold text-pakka-400"><UserRoundCheck size={18} />Owner, not broker</span>
            </div>
          </Tile>
          <Tile dark className="md:col-span-2">
            <p className="text-[13px] font-semibold text-pakka-400">Confirmed by a call</p>
            <p className="text-gradient-cyan mt-6 text-[64px] font-semibold leading-none tracking-tightest">48h</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-400">A listing only counts as current for two days after the owner confirms it on a call.</p>
          </Tile>
          <Tile dark className="md:col-span-2">
            <p className="text-[13px] font-semibold text-[#ff6961]">Brokers, caught</p>
            <p className="mt-5 rounded-2xl rounded-bl-md bg-white/10 px-4 py-3 text-[15px] text-white">“Actually, I'm the broker.”</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-400">Pakka simply asks. Brokers get flagged and never reach a tenant.</p>
          </Tile>
          <Tile className="md:col-span-3">
            <p className="eyebrow">One call, not forty</p>
            <p className="mt-3 text-[28px] font-semibold leading-tight tracking-display">Tell Pakka what you need. It calls the owners for you, then calls you back.</p>
          </Tile>
          <Tile className="md:col-span-3">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <PhoneOff size={22} className="text-ink-900" />
                <p className="mt-3 text-[17px] font-semibold">“Don't call me.”</p>
                <p className="mt-1 text-[15px] text-ink-500">Said once, honoured forever.</p>
              </div>
              <div>
                <ShieldCheck size={22} className="text-ink-900" />
                <p className="mt-3 text-[17px] font-semibold">AI that says it's AI.</p>
                <p className="mt-1 text-[15px] text-ink-500">Every call opens with it.</p>
              </div>
            </div>
          </Tile>
        </div>
      </Section>

      {/* ── How it works (scroll-driven) ───────────── */}
      <HowItWorksScroll />

      {/* ── Call me ───────────────────────────────────── */}
      <Section grey id="call" className="py-28 md:py-36">
        <div className="grid items-center gap-14 md:grid-cols-2">
          <Reveal>
            <h2 className="text-[40px] font-semibold leading-[1.06] tracking-display md:text-[56px]">Talk to Pakka.<br /><span className="text-ink-400">Right now.</span></h2>
            <p className="mt-6 max-w-[440px] text-[19px] leading-relaxed text-ink-500">Leave your number and Pakka's assistant calls you within seconds. Tell her what you're looking for. She'll do the calling around.</p>
          </Reveal>
          <Reveal delay={120}><CallMeForm /></Reveal>
        </div>
      </Section>

      {/* ── Owners ────────────────────────────────────── */}
      <Section id="owners" className="py-28 md:py-36">
        <Reveal className="text-center">
          <p className="eyebrow">For owners</p>
          <h2 className="mt-2 text-[40px] font-semibold tracking-display md:text-[56px]">Fewer calls. Better tenants.</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[19px] text-ink-500 md:text-[21px]">Tell Pakka your rules once. Only tenants who fit them ever reach you.</p>
        </Reveal>
        <div className="mt-16 grid gap-10 text-center sm:grid-cols-2 md:grid-cols-4">
          {[
            ['₹0', 'Free for owners. Always.'],
            ['1 min', 'A quick check-in call every few days.'],
            ['4', 'Languages. Yours included.'],
            ['Once', 'You tell Pakka your rules. Tenants are screened against them.'],
          ].map(([big, small], i) => (
            <Reveal key={small} delay={i * 80}>
              <p className="text-[48px] font-semibold tracking-tightest text-ink-900">{big}</p>
              <p className="mx-auto mt-2 max-w-[200px] text-[15px] text-ink-500">{small}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Final CTA ─────────────────────────────────── */}
      <Section dark className="py-32 text-center md:py-44">
        <Reveal>
          <h2 className="text-[48px] font-semibold leading-[1.02] tracking-tightest md:text-[80px]">
            Aaj tumhara ghar<br /><span className="text-gradient-cyan">Pakka.</span>
          </h2>
          <div className="mt-10 flex items-center justify-center gap-6">
            <Link to="/flats" className="btn h-11 bg-white px-6 text-[17px] text-ink-900 hover:bg-white/90">See verified flats</Link>
            <a href="#call" className="inline-flex items-center text-[17px] text-pakka-400 hover:underline">Get a call <ChevronRight size={18} /></a>
          </div>
        </Reveal>
      </Section>
    </main>
  );
}
