import QRCode from 'react-qr-code'
import { JSX, useEffect, useState } from 'react'
import { validateOrRefreshToken } from '@renderer/assets/main'
import { generate2faSecret, TwoFactorData, verify2faCode } from '@renderer/assets/account'

interface Props {
  onBack: () => void,
  authToken: string
}

export function Setup2FA({ onBack, authToken }: Props ) : JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successMessage] = useState<string>('Successfully enabled 2fa!')


  useEffect(() => {
    const handle2fa = async () : Promise<void> => {
        const token : string =  await validateOrRefreshToken(authToken);
        const data : TwoFactorData = await generate2faSecret(token);
        setUrl(data.twoFactorUrl);
        setSecret(data.twoFactorSecret);
    }
    handle2fa();
  }, [authToken])

  const handleVerify2FA = async ()   => {
    try {
      const token: string =  await validateOrRefreshToken(authToken);
      await verify2faCode(token,code as string);
      setSuccess(true);
      setTimeout(() => setSuccess(false) , 2000);
      setTimeout(() => onBack() , 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000)
    }

  }


  return (
    <div className="p-8 w-full mx-auto space-y-8 overflow-y-auto h-full">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-widest text-white">
          Two-factor authentification (2FA)
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Set-up Two-factor authentification for your account
        </p>
      </div>
      <button onClick={onBack} className="text-white mb-4">
        ← Back
      </button>
      <div className=" bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
        <div className={'flex items-center flex-col'}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center border border-violet-500/20">
              1.
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                Download authentification app
              </h3>
            </div>
          </div>
          <div className="flex items-start gap-3 w-full">
            <p className=" ml-10 text-sm text-gray-400">
              Download{' '}
              <span className={'text-violet-400 underline'}>
                <a
                  href={'https://support.google.com/accounts/answer/1066447?hl=en'}
                  target={'_blank'}
                  rel="noreferrer"
                >
                  Google Authenticator
                </a>
              </span>{' '}
              on your phone or tablet.
            </p>
          </div>
        </div>

        <div className={'flex items-center flex-col '}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center border border-violet-500/20">
              2.
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">
                Scan QR CODE
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full">
            <div
              className={
                ' ml-10 mt-2 bg-white p-2 rounded-md flex items-center justify-center border border-violet-500/20">'
              }
            >
              <QRCode value={url as string} size={100} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="ml-5 text-sm text-gray-400">
                Open the authentication app and scan the image on the left using your phone&#39;s
                camera.
              </p>
              <div className="mt-4 ml-5 p-3 bg-white/5 rounded-xl border border-white/10 group hover:border-violet-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                    Manual Setup Key
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(secret as string)}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-bold uppercase transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <code className="text-white font-mono text-sm block bg-black/20 p-2 rounded-lg border border-white/5 break-all">
                  {secret}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className={'flex items-center flex-col '}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center border border-violet-500/20">
              3.
            </div>
            <div>
              <h3 className="text-white font-bold uppercase text-sm tracking-wider">Enter Code</h3>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 w-full">
            <div>
              <p className="ml-5 text-sm text-gray-400">
                Enter the 6-digit code generated by the app
              </p>
            </div>
            <div>
              <input
                type={'text'}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-gray-700/20 border border-white/10 rounded-xl p-2.5 pr-10 text-xs text-white outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="000 000"
              />
            </div>

            <button onClick={handleVerify2FA} className="w-[30%] bg-white/5 hover:bg-white/10 text-white py-2 rounded-xl font-bold text-xs uppercase border border-white/5 transition-all active:scale-[0.98]">
              Activate
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-xl text-sm font-medium">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
