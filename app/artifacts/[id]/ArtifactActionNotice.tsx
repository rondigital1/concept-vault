type Props = {
  error: string | undefined;
  info: string | undefined;
};

export function ArtifactActionNotice({ error, info }: Props) {
  if (error) {
    return (
      <div className="mt-8 rounded-[24px] border border-[#5a2e2e] bg-[#2a1818] px-5 py-4 text-[0.98rem] text-[#f3cece]">
        {error}
      </div>
    );
  }

  if (info) {
    return (
      <div className="mt-8 rounded-[24px] border border-white/8 bg-[#171717] px-5 py-4 text-[0.98rem] text-[#d9ead8]">
        {info}
      </div>
    );
  }

  return null;
}
