export function ChatBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-white/[0.04] blur-[130px]" />
      <div className="absolute bottom-[-18%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-white/[0.03] blur-[150px]" />
    </div>
  );
}
