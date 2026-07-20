import { JSX } from 'react'

interface Props {
  deviceId: string
}

export function AboutApp({ deviceId }: Props): JSX.Element {
  const version = '0.2.2 Seleant'
  const author = 'Glueeed'

  return (
    <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto h-full">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">GlueChat</h2>
        <p className="text-gray-500 text-sm mt-1">About Application</p>
      </div>

      <div className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
          <span className="text-gray-400">Version</span>
          <span className="text-white font-mono">{version}</span>
        </div>
        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
          <span className="text-gray-400">Author</span>
          <span className="text-white">{author}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Device ID</span>
          <div className="text-violet-400 font-mono text-xs break-all bg-gray-900 p-3 rounded-2xl border border-gray-700">
            {deviceId}
          </div>
        </div>
      </div>
    </div>
  )
}
