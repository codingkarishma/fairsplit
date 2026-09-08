function StepCard({ number, title, description }) {
  return (
    <div className="relative border-l border-blue-200 pl-6 sm:border-l-0 sm:pl-0">
      <span className="absolute -left-3.5 top-0 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white sm:static sm:mb-5">
        {number}
      </span>
      <h3 className="font-display text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default StepCard;
