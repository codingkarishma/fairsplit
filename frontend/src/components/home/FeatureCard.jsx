import { Card } from '../common/Card';

function FeatureCard({ icon, title, description }) {
  const Icon = icon;

  return (
    <Card className="group transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-30px_rgba(37,99,235,0.5)]">
      <div
        className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-xl text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"
        aria-hidden="true"
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </Card>
  );
}

export default FeatureCard;
