import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import FeatureCard from '../components/home/FeatureCard';
import StepCard from '../components/home/StepCard';
import { ArrowUpRight, Divide, ReceiptText } from 'lucide-react';

const features = [
  {
    icon: ReceiptText,
    title: 'Receipt to items',
    description:
      'Upload a receipt and turn the messy line items into a clean, shared bill.',
  },
  {
    icon: ArrowUpRight,
    title: 'Claim in real time',
    description:
      'Everyone chooses what they had from their own phone. No account required.',
  },
  {
    icon: Divide,
    title: 'Fair by default',
    description:
      'Taxes and totals stay visible, so every person pays exactly their share.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create a bill',
    description: 'Start with a receipt or add items manually in seconds.',
  },
  {
    number: '02',
    title: 'Share the link',
    description: 'Your group joins with one simple code. No sign-up wall.',
  },
  {
    number: '03',
    title: 'Settle up',
    description: 'See the final breakdown and pay the right person.',
  },
];

function HomePage() {
  return (
    <div className="overflow-hidden">
      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="pointer-events-none absolute -right-32 -top-28 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Group dinners, without the maths
          </p>
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight text-slate-950 sm:text-7xl">
            The easy way to split the bill
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500 sm:text-xl">
            FairSplit turns one receipt into a shared, live bill.
            Simply upload it, Share it, and let everyone claim what they had
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link to="/host">
              <Button size="lg">
                Create a bill <span aria-hidden="true">→</span>
              </Button>
            </Link>
            <Link to="/join">
              <Button size="lg" variant="outline">
                Join via code
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              ✓
            </span>
            No account. No awkward spreadsheet. Just a fair split.
          </div>
        </div>
      </section>

      <section
        className="border-y border-slate-200/70 bg-white/55"
        aria-labelledby="features-title"
      >
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Built for the table
            </p>
            <h2
              id="features-title"
              className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
            >
              Less chasing. More enjoying.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section
        className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"
        aria-labelledby="steps-title"
      >
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
          Three small steps
        </p>
        <h2
          id="steps-title"
          className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          From receipt to resolved.
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step) => (
            <StepCard key={step.number} {...step} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default HomePage;
