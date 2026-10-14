export function Badge({ src, label }: { src: string; label: string }) {
  return (
    <div className="group relative flex items-center justify-center">
      <img src={src} className="w-4.5 h-4.5 cursor-pointer" alt={label} />
      <span className="absolute top-full mb-2 hidden group-hover:flex px-2 py-1 bg-gray-950 text-white text-[8px] font-bold rounded shadow-lg whitespace-nowrap z-50 border border-white/10 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}
