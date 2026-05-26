export default function RegisterStepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      <div className="flex items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 1 ? 'bg-[#d5b46f] text-[#111]' : 'bg-white text-[#7c8698] border border-[#eadfce]'}`}>1</div>
        <span className="ml-2 hidden text-sm font-medium text-[#5b6778] sm:inline">Type de compte</span>
      </div>
      <div className={`h-px w-16 ${step >= 2 ? 'bg-[#d5b46f]' : 'bg-[#d8c8af]'}`}></div>
      <div className="flex items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step >= 2 ? 'bg-[#d5b46f] text-[#111]' : 'bg-white text-[#7c8698] border border-[#eadfce]'}`}>2</div>
        <span className="ml-2 hidden text-sm font-medium text-[#5b6778] sm:inline">Informations</span>
      </div>
    </div>
  );
}
