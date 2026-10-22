import { ChevronRight, Clock3, Home as HomeIcon, IndianRupee, Languages, Lock, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import CallMeForm from '../../components/CallMeForm';
import RealCallPlayer from '../../components/RealCallPlayer';
import HowItWorksScroll from '../../components/HowItWorksScroll';
import LiveCallDemo from '../../components/LiveCallDemo';
import Reveal from '../../components/Reveal';

const SCRIPTS = [
  { word: 'ಕನ್ನಡ', name: 'Kannada', line: 'ITPL ಹತ್ರ ಒಂದು 2 BHK ಬೇಕು.' },
  { word: 'हिंदी', name: 'Hindi', line: 'ITPL के पास 2 BHK चाहिए।' },
  { word: 'தமிழ்', name: 'Tamil', line: 'ITPL பக்கத்துல 2 BHK வேணும்.' },
  { word: 'English', name: 'English', line: 'I need a 2 BHK near ITPL.' },
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
          <h1 className="mx-auto mt-3 animate-fade-up text-[52px] font-semibold leading-[1.02] tracking-tightest text-ink-900 [animation-delay:80ms] md:text-[96px]">
            Straight from the owner.<br />
            <span className="text-gradient-brand">Pakka.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] animate-fade-up text-[19px] leading-[1.42] text-ink-500 [animation-delay:160ms] md:text-[24px]">
            Rent your next flat directly from its owner. Zero brokerage, and you move in sooner.
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
            <span className="text-gradient-dark">Your next home is one call away.</span>{' '}
            <span className="text-ink-500">Straight from the owner.</span>
          </h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-10 max-w-[620px] text-[19px] leading-relaxed text-ink-400 md:text-[21px]">
            Pakka connects you with owners directly. You see real flats sooner, talk to the person who decides,
            <span className="text-white"> and move in with zero brokerage.</span>
          </p>
        </Reveal>
      </Section>

      {/* ── Languages ─────────────────────────────────── */}
      <Section dark className="pb-28 md:pb-40">
        <Reveal>
          <p className="text-[17px] font-semibold text-pakka-400 md:text-[21px]">Ask in your own language.</p>
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
            Talk to Pakka the way you talk. Kannada, Hindi, Tamil or English, and switch mid-sentence if you like.
          </p>
        </Reveal>
      </Section>

      {/* ── Why Pakka ─────────────────────────────────── */}
      <Section grey id="why" className="py-28 md:py-36">
        <Reveal className="text-center">
          <h2 className="text-[40px] font-semibold tracking-display md:text-[56px]">Why rent with Pakka.</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[19px] text-ink-500 md:text-[21px]">Pakka brings owners and tenants together, directly.</p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-6">
          <Tile className="md:col-span-4 md:row-span-2">
            <p className="eyebrow">Direct from owners</p>
            <h3 className="mt-2 text-[32px] font-semibold leading-tight tracking-display md:text-[40px]">Every flat comes from the person who owns it.</h3>
            <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-ink-500">You deal directly with the owner. Clear rent, clear rules, and straight answers to your questions.</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-[15px] font-semibold text-white"><UserRound size={18} />Owner, direct</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-[15px] font-semibold text-pakka-400"><HomeIcon size={18} />Real, available flats</span>
            </div>
          </Tile>
          <Tile dark className="md:col-span-2">
            <p className="text-[13px] font-semibold text-pakka-400">Brokerage</p>
            <p className="text-gradient-cyan mt-6 text-[64px] font-semibold leading-none tracking-tightest">₹0</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-400">Pakka is free for tenants. Always.</p>
          </Tile>
          <Tile dark className="md:col-span-2">
            <p className="text-[13px] font-semibold text-pakka-400">Faster</p>
            <p className="mt-5 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-display"><Clock3 size={26} className="text-pakka-400" />Answers in minutes.</p>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-400">Get your questions answered and a visit booked without chasing anyone.</p>
          </Tile>
          <Tile className="md:col-span-3">
            <p className="eyebrow">Just one call</p>
            <p className="mt-3 text-[28px] font-semibold leading-tight tracking-display">Tell Pakka what you need. Get flats that match, and a visit booked.</p>
          </Tile>
          <Tile className="md:col-span-3">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Languages size={22} className="text-ink-900" />
                <p className="mt-3 text-[17px] font-semibold">Your language.</p>
                <p className="mt-1 text-[15px] text-ink-500">Kannada, Hindi, Tamil or English.</p>
              </div>
              <div>
                <Lock size={22} className="text-ink-900" />
                <p className="mt-3 text-[17px] font-semibold">Your number stays private.</p>
                <p className="mt-1 text-[15px] text-ink-500">Only Pakka can see it.</p>
              </div>
            </div>
          </Tile>
        </div>
      </Section>

      {/* ── How it works (scroll-driven) ───────────── */}
      <HowItWorksScroll />

      {/* ── Call me ───────────────────────────────────── */}
      <Section grey id="call" className="py-28 md:py-36">
        <Reveal>
          <h2 className="text-[40px] font-semibold leading-[1.06] tracking-display md:text-[56px]">Hear Pakka at work.<br /><span className="text-ink-400">Then let her call you.</span></h2>
          <p className="mt-6 max-w-[620px] text-[19px] leading-relaxed text-ink-500">A real call: Pakka checks a flat with its owner, gets the latest rent and rules, and books a visit. Sign in and she'll call you the same way to find your flat.</p>
        </Reveal>
        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Reveal><RealCallPlayer /></Reveal>
          <Reveal delay={120}><CallMeForm /></Reveal>
        </div>
      </Section>

      {/* ── Owners ────────────────────────────────────── */}
      <Section id="owners" className="py-28 md:py-36">
        <Reveal className="text-center">
          <p className="eyebrow">For owners</p>
          <h2 className="mt-2 text-[40px] font-semibold tracking-display md:text-[56px]">Rent out faster. Pay only when it works.</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[19px] text-ink-500 md:text-[21px]">List your flat for free and meet tenants who fit what you're looking for. You pay only when we find your tenant.</p>
        </Reveal>
        <div className="mt-16 grid gap-10 text-center sm:grid-cols-2 md:grid-cols-4">
          {[
            [<IndianRupee key="r" size={40} className="mx-auto" strokeWidth={2.2} />, 'List for free. Pay only when we find your tenant.'],
            ['Your rules', 'Families, bachelors, pets: tenants who fit them.'],
            ['4', 'Languages. Yours included.'],
            ['Direct', 'Tenants come to you straight through Pakka.'],
          ].map(([big, small], i) => (
            <Reveal key={small} delay={i * 80}>
              <div className="flex h-[58px] items-center justify-center text-[44px] font-semibold tracking-tightest text-ink-900">{big}</div>
              <p className="mx-auto mt-2 max-w-[210px] text-[15px] text-ink-500">{small}</p>
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
            <Link to="/flats" className="btn h-11 bg-white px-6 text-[17px] text-ink-900 hover:bg-white/90">See flats</Link>
            <a href="#call" className="inline-flex items-center text-[17px] text-pakka-400 hover:underline">Get a call <ChevronRight size={18} /></a>
          </div>
        </Reveal>
      </Section>
    </main>
  );
}
